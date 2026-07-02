import { footballProviderManager } from "../providers/football/footballProvider.manager";
import { apiFootballProvider } from "../providers/football/apiFootball.provider";
import { footballDataProvider } from "../providers/football/footballData.provider";
import { WORLD_CUP_LEAGUE_ID } from "../providers/football/leagueMap";
import { mergeScorerPhotos } from "../providers/football/scorerPhotoUtils";
import { findApiFootballFixtureId } from "../providers/football/matchLookupUtils";
import type { MatchDetailsResult, TopScorer } from "../providers/football/football.types";

export type { NormalizedMatch, MatchDetailsResult, NormalizedMatchEvent } from "../providers/football/football.types";
export type { KnockoutBracketData } from "../providers/football/knockoutUtils";

function emptyMatchDetails(): MatchDetailsResult {
  return { match: null, statistics: [], events: [], lineups: [] };
}

async function enrichMatchDetails(result: MatchDetailsResult): Promise<MatchDetailsResult> {
  if (!result.match || result.events.length > 0 || !apiFootballProvider.isAvailable()) {
    return result;
  }

  try {
    const afId = await findApiFootballFixtureId(result.match, apiFootballProvider);
    if (!afId || afId === result.match.id) return result;

    const af = await apiFootballProvider.getMatchDetails(afId);
    return {
      ...result,
      events: af.events.length > 0 ? af.events : result.events,
      statistics: af.statistics.length > 0 ? af.statistics : result.statistics,
      lineups: af.lineups.length > 0 ? af.lineups : result.lineups,
    };
  } catch {
    return result;
  }
}

async function withPlayerPhotos(
  rows: TopScorer[],
  league: number,
  season: number
): Promise<TopScorer[]> {
  if (!rows.length || rows.every((row) => row.player.photo?.trim())) {
    return rows;
  }
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

  getTeamFixtures: (team: number, season: number) =>
    footballProviderManager.execute("getTeamFixtures", team, season),

  getMatchDetails: async (id: number) => {
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

  getTeam: (id: number) => footballProviderManager.execute("getTeam", id),

  getPlayer: (id: number, season: number) =>
    footballProviderManager.execute("getPlayer", id, season),

  search: (query: string) => footballProviderManager.searchMerged(query),

  getKnockoutBracket: (league: number, season: number) => {
    if (league !== WORLD_CUP_LEAGUE_ID) {
      return Promise.resolve(null);
    }
    return footballDataProvider.getKnockoutBracket(league, season);
  },
};
