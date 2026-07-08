import { footballProviderManager } from "../providers/football/footballProvider.manager";
import { apiFootballProvider } from "../providers/football/apiFootball.provider";
import { footballDataProvider } from "../providers/football/footballData.provider";
import { WORLD_CUP_LEAGUE_ID } from "../providers/football/leagueMap";
import { mergeScorerPhotos } from "../providers/football/scorerPhotoUtils";
import { findApiFootballFixtureId } from "../providers/football/matchLookupUtils";
import { cache } from "./cache.service";
import type { MatchDetailsResult, TopScorer } from "../providers/football/football.types";

export type { NormalizedMatch, MatchDetailsResult, NormalizedMatchEvent } from "../providers/football/football.types";
export type { KnockoutBracketData } from "../providers/football/knockoutUtils";

function emptyMatchDetails(): MatchDetailsResult {
  return { match: null, statistics: [], events: [], lineups: [] };
}

async function enrichMatchDetails(result: MatchDetailsResult): Promise<MatchDetailsResult> {
  if (!result.match || !apiFootballProvider.isAvailable()) {
    return result;
  }

  const needsEnrichment =
    result.lineups.length === 0 ||
    result.statistics.length === 0 ||
    result.events.length === 0;

  if (!needsEnrichment) {
    return result;
  }

  try {
    const afId = await findApiFootballFixtureId(result.match, apiFootballProvider);
    if (!afId || afId === result.match.id) {
      return result;
    }

    const af = await apiFootballProvider.getMatchDetails(afId);
    return {
      ...result,
      events: af.events.length > 0 ? af.events : result.events,
      statistics: af.statistics.length > 0 ? af.statistics : result.statistics,
      lineups: af.lineups.length > 0 ? af.lineups : result.lineups,
    };
  } catch (error) {
    console.warn("[Football] Match enrichment failed:", (error as Error).message);
    return result;
  }
}

async function loadMatchDetails(id: number): Promise<MatchDetailsResult> {
  if (footballDataProvider.isAvailable()) {
    try {
      const fd = await footballDataProvider.getMatchDetails(id);
      if (fd.match) {
        return enrichMatchDetails(fd);
      }
    } catch {
      // fall through to API-Football
    }
  }

  if (apiFootballProvider.isAvailable()) {
    try {
      const af = await apiFootballProvider.getMatchDetails(id);
      if (af.match) return af;
    } catch {
      // fall through
    }
  }

  return emptyMatchDetails();
}

async function withPlayerPhotos(
  rows: TopScorer[],
  league: number,
  season: number
): Promise<TopScorer[]> {
  if (!rows.length) return rows;
  if (!apiFootballProvider.isAvailable()) {
    return rows;
  }

  try {
    const catalog = await apiFootballProvider.getScorerPhotoCatalog(league, season);
    return mergeScorerPhotos(rows, catalog);
  } catch {
    return rows;
  }
}

/**
 * Football data service — delegates to the multi-provider manager
 * with automatic failover between API-Football and football-data.org.
 */
export const footballService = {
  getLiveMatches: () => footballProviderManager.getLiveMatchesMerged(),

  getFixturesByDate: (date: string) =>
    footballProviderManager.execute("getFixturesByDate", date),

  getFixturesByLeague: (
    league: number,
    season: number,
    limit?: number,
    range?: import("../providers/football/fixturesUtils").FixtureRange
  ) => footballProviderManager.execute("getFixturesByLeague", league, season, limit, range),

  getMatchDetails: async (id: number) => {
    const cacheKey = `match:enriched:v2:${id}`;
    const cached = cache.get<MatchDetailsResult>(cacheKey);
    if (
      cached?.match &&
      (cached.lineups.length > 0 || cached.events.length > 0 || cached.statistics.length > 0)
    ) {
      return cached;
    }

    try {
      const result = await loadMatchDetails(id);
      if (
        result.match &&
        (result.lineups.length > 0 || result.events.length > 0 || result.statistics.length > 0)
      ) {
        cache.set(cacheKey, result, 86_400);
      }
      return result;
    } catch (error) {
      const stale = cache.getStale<MatchDetailsResult>(cacheKey);
      if (stale?.match) {
        console.warn(`[Football] Serving stale enriched match details for ${id}`);
        return stale;
      }
      throw error;
    }
  },

  getHeadToHead: (home: number, away: number) =>
    apiFootballProvider.getHeadToHead(home, away),

  getStandings: (league: number, season: number) =>
    footballProviderManager.execute("getStandings", league, season),

  getTopScorers: async (league: number, season: number) =>
    withPlayerPhotos(
      await footballProviderManager.execute("getTopScorers", league, season),
      league,
      season
    ),

  getTopAssists: async (league: number, season: number) =>
    withPlayerPhotos(
      await footballProviderManager.execute("getTopAssists", league, season),
      league,
      season
    ),

  getLeagues: () => apiFootballProvider.getLeagues(),

  getTeam: async (id: number) => {
    if (footballDataProvider.isAvailable()) {
      try {
        const fd = await footballDataProvider.getTeam(id);
        if (fd) return fd;
      } catch {
        // fall through to API-Football
      }
    }

    if (apiFootballProvider.isAvailable()) {
      try {
        const af = await apiFootballProvider.getTeam(id);
        if (af) return af;
      } catch {
        // fall through
      }
    }

    return null;
  },

  getTeamFixtures: async (team: number, season: number) => {
    if (footballDataProvider.isAvailable()) {
      try {
        const fd = await footballDataProvider.getTeamFixtures(team, season);
        if (fd.length > 0) return fd;
      } catch {
        // fall through
      }
    }

    return footballProviderManager.execute("getTeamFixtures", team, season);
  },

  getPlayer: async (id: number, season: number) => {
    if (apiFootballProvider.isAvailable()) {
      try {
        const af = await apiFootballProvider.getPlayer(id, season);
        if (af) return af;
      } catch {
        // fall through
      }
    }

    return footballProviderManager.execute("getPlayer", id, season);
  },

  search: (query: string) => footballProviderManager.searchMerged(query),

  getKnockoutBracket: (league: number, season: number) => {
    if (league !== WORLD_CUP_LEAGUE_ID) {
      return Promise.resolve(null);
    }
    return footballDataProvider.getKnockoutBracket(league, season);
  },
};
