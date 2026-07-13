import { footballProviderManager } from "../providers/football/footballProvider.manager";
import { apiFootballProvider } from "../providers/football/apiFootball.provider";
import { footballDataProvider } from "../providers/football/footballData.provider";
import { WORLD_CUP_LEAGUE_ID } from "../providers/football/leagueMap";
import { mergeScorerPhotos } from "../providers/football/scorerPhotoUtils";
import {
  attachDetailFixtureIds,
  cacheFdToAfMapping,
  findApiFootballFixtureId,
  prewarmFixtureMappings,
  resolveAlternateFixtureIds,
} from "../providers/football/matchLookupUtils";
import {
  lineupStarterCount,
  preferLineups,
  preferTeamStatistics,
  teamStatisticsTypeCount,
} from "../providers/football/matchMergeUtils";
import { theSportsDbProvider, findApiFootballIdFromTheSportsDb } from "../providers/football/theSportsDb.provider";
import { theSportsDbPlayerProvider } from "../providers/football/theSportsDbPlayer.provider";
import { enrichPlayerProfile } from "../providers/football/playerEnrichment";
import {
  hasAnyMatchDetails,
  isCompleteMatchDetails,
  isRealScorerEvent,
} from "../providers/football/matchQualityUtils";
import { sanitizeMatchEvents, mergeEventTimelines } from "../providers/football/matchEventsUtils";
import type { NormalizedMatchEvent } from "../providers/football/matchEventsUtils";
import type { NormalizedPlayerProfile } from "../providers/football/playerProfile.types";
import { cache } from "./cache.service";
import { persistentMatchCache } from "./persistentMatchCache";
import {
  leagueCacheKey,
  loadKnockoutData,
  loadLeagueListData,
  withPersistentLeagueData,
} from "./leagueDataCache";
import type { MatchDetailsResult, NormalizedMatch, TopScorer } from "../providers/football/football.types";

export type { NormalizedMatch, MatchDetailsResult, NormalizedMatchEvent } from "../providers/football/football.types";
export type { KnockoutBracketData } from "../providers/football/knockoutUtils";

function emptyMatchDetails(): MatchDetailsResult {
  return { match: null, statistics: [], events: [], lineups: [] };
}

function normalizeMatchDetails(result: MatchDetailsResult): MatchDetailsResult {
  if (!result.match) return result;
  return {
    ...result,
    events: sanitizeMatchEvents(result.events, result.match),
  };
}

function buildMatchMeta(result: MatchDetailsResult): MatchDetailsResult {
  const normalized = normalizeMatchDetails(result);
  if (!normalized.match) return normalized;

  if (isCompleteMatchDetails(normalized)) {
    return { ...normalized, meta: { status: "full" } };
  }

  if (hasAnyMatchDetails(normalized)) {
    return {
      ...normalized,
      meta: {
        status: "limited",
        message:
          "Some match details are still loading. Refresh in a moment for full goalscorers, stats, and lineups.",
      },
    };
  }

  const finished = ["FT", "AET", "PEN"].includes(normalized.match.status.short);

  if (!finished) {
    return {
      ...normalized,
      meta: {
        status: "pending",
        message:
          "Goalscorers, stats, and lineups will appear here once the match starts and data is available from the provider.",
      },
    };
  }

  return {
    ...normalized,
    meta: {
      status: "limited",
      message:
        "Detailed match data is not available yet for this fixture. Try again after kick-off or check a more recent match.",
    },
  };
}

function enrichedCacheKey(id: number): string {
  return `match:enriched:v7:${id}`;
}

function goalEventCount(events: NormalizedMatchEvent[]): number {
  return events.filter(isRealScorerEvent).length;
}

function preferEvents(
  current: NormalizedMatchEvent[],
  incoming: NormalizedMatchEvent[]
): NormalizedMatchEvent[] {
  const currentGoals = goalEventCount(current);
  const incomingGoals = goalEventCount(incoming);
  if (incomingGoals > currentGoals) return incoming;
  if (currentGoals > incomingGoals) return current;
  if (incoming.length > current.length) return incoming;
  return current.length > 0 ? current : incoming;
}

function preferArray<T>(current: T[], incoming: T[]): T[] {
  return incoming.length > current.length ? incoming : current.length > 0 ? current : incoming;
}

function isFinishedMatch(result: MatchDetailsResult): boolean {
  const short = result.match?.status.short;
  return short === "FT" || short === "AET" || short === "PEN";
}

/** Skip thin partial snapshots so we keep trying richer providers. */
function isWorthCaching(result: MatchDetailsResult): boolean {
  if (!result.match || !hasAnyMatchDetails(result)) return false;
  if (!isFinishedMatch(result)) return true;
  if (isCompleteMatchDetails(result)) return true;
  return (
    teamStatisticsTypeCount(result.statistics) >= 8 ||
    lineupStarterCount(result.lineups) >= 14
  );
}

function mergeDetailFields(
  current: MatchDetailsResult,
  incoming: MatchDetailsResult,
  match: NonNullable<MatchDetailsResult["match"]>
): MatchDetailsResult {
  const events = sanitizeMatchEvents(
    preferEvents(current.events, incoming.events),
    match
  );
  return {
    ...current,
    events,
    statistics: preferTeamStatistics(current.statistics, incoming.statistics),
    lineups: preferLineups(current.lineups, incoming.lineups),
    scoreSummary: current.scoreSummary?.length
      ? current.scoreSummary
      : incoming.scoreSummary,
  };
}

async function readCachedPartial(ids: number[]): Promise<MatchDetailsResult | null> {
  for (const id of ids) {
    const mem = cache.get<MatchDetailsResult>(enrichedCacheKey(id));
    if (mem?.match && isWorthCaching(mem)) return mem;

    const staleMem = cache.getStale<MatchDetailsResult>(enrichedCacheKey(id));
    if (staleMem?.match && isWorthCaching(staleMem)) return staleMem;

    const disk = await persistentMatchCache.get(id);
    if (disk?.match && isWorthCaching(disk)) return disk;
  }
  return null;
}

async function readCachedComplete(ids: number[]): Promise<MatchDetailsResult | null> {
  for (const id of ids) {
    const mem = cache.get<MatchDetailsResult>(enrichedCacheKey(id));
    if (mem?.match && isCompleteMatchDetails(mem)) return mem;

    const disk = await persistentMatchCache.get(id);
    if (disk?.match && isCompleteMatchDetails(disk)) return disk;
  }
  return null;
}

async function persistEnrichedMatch(
  requestId: number,
  result: MatchDetailsResult
): Promise<void> {
  if (!result.match || !isWorthCaching(result)) return;

  const ttl = isCompleteMatchDetails(result) ? 86_400 * 7 : 86_400;
  const ids = new Set(resolveAlternateFixtureIds(requestId));
  ids.add(result.match.id);

  for (const id of ids) {
    const payload =
      id === result.match.id
        ? result
        : { ...result, match: { ...result.match, id } };

    cache.set(enrichedCacheKey(id), payload, ttl);
    await persistentMatchCache.set(id, payload);
  }
}

async function enrichMatchDetails(result: MatchDetailsResult): Promise<MatchDetailsResult> {
  if (!result.match || !apiFootballProvider.isAvailable()) {
    return result;
  }

  if (isCompleteMatchDetails(result)) {
    return result;
  }

  let resolvedAfId: number | null = null;

  try {
    let afId = await findApiFootballIdFromTheSportsDb(result.match);
    if (!afId) {
      afId = await findApiFootballFixtureId(result.match, apiFootballProvider);
    }
    if (!afId) {
      console.warn(
        `[Football] No API-Football fixture for ${result.match.teams.home.name} vs ${result.match.teams.away.name} (fd:${result.match.id})`
      );
      return result;
    }

    resolvedAfId = afId;

    if (result.match.source === "football-data" && afId !== result.match.id) {
      cacheFdToAfMapping(result.match.id, afId);
    }

    if (afId === result.match.id && result.match.source === "football-data") {
      return result;
    }

    const af = await apiFootballProvider.getMatchDetails(afId);
    return mergeDetailFields(result, af, result.match);
  } catch (error) {
    console.warn("[Football] Match enrichment failed:", (error as Error).message);
    if (resolvedAfId) {
      const staleKey = `af:match-details:v1:${resolvedAfId}`;
      const stale =
        cache.get<MatchDetailsResult>(staleKey) ??
        cache.getStale<MatchDetailsResult>(staleKey);
      if (stale?.match && hasAnyMatchDetails(stale)) {
        console.warn(`[Football] Merging stale API-Football details for fixture ${resolvedAfId}`);
        return mergeDetailFields(result, stale, result.match);
      }
    }
    return result;
  }
}

async function enrichWithFallbacks(result: MatchDetailsResult): Promise<MatchDetailsResult> {
  if (!result.match) return result;

  let current = await enrichMatchDetails(result);

  if (!isCompleteMatchDetails(current) && current.match) {
    const tsdb = await theSportsDbProvider.getMatchDetails(current.match);
    const mergedEvents = sanitizeMatchEvents(
      mergeEventTimelines(current.events, tsdb.events),
      current.match
    );
    current = {
      ...current,
      events: mergedEvents,
      statistics: preferTeamStatistics(current.statistics, tsdb.statistics),
      lineups: preferLineups(current.lineups, tsdb.lineups),
    };
    if (hasAnyMatchDetails(current) && !hasAnyMatchDetails(result) && current.match) {
      console.log(
        `[Football] Enriched via TheSportsDB: ${current.match.teams.home.name} vs ${current.match.teams.away.name}`
      );
    }
  }

  return current;
}

async function loadMatchDetails(id: number): Promise<MatchDetailsResult> {
  if (footballDataProvider.isAvailable()) {
    try {
      const fd = await footballDataProvider.getMatchDetails(id);
      if (fd.match) {
        return enrichWithFallbacks(fd);
      }
    } catch {
      // fall through
    }
  }

  if (apiFootballProvider.isAvailable()) {
    try {
      const af = await apiFootballProvider.getMatchDetails(id);
      if (af.match) {
        return enrichWithFallbacks(af);
      }
    } catch {
      // fall through
    }
  }

  const alternateIds = resolveAlternateFixtureIds(id);
  const afId = alternateIds.find((candidate) => candidate !== id);
  if (afId && apiFootballProvider.isAvailable()) {
    try {
      const af = await apiFootballProvider.getMatchDetails(afId);
      if (af.match) {
        return enrichWithFallbacks(af);
      }
    } catch {
      // fall through
    }
  }

  return emptyMatchDetails();
}

function attachDetailIds(matches: NormalizedMatch[]): NormalizedMatch[] {
  return attachDetailFixtureIds(matches);
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
  getLiveMatches: async () => {
    const fixtures = await footballProviderManager.getLiveMatchesMerged();
    await prewarmFixtureMappings(fixtures);
    return attachDetailIds(fixtures);
  },

  getFixturesByDate: async (date: string) => {
    const cacheKey = leagueCacheKey("fixtures-date", date);
    const fixtures = await withPersistentLeagueData(cacheKey, async () => {
      const loaded = await footballProviderManager.execute("getFixturesByDate", date);
      await prewarmFixtureMappings(loaded);
      return attachDetailIds(loaded);
    });
    return fixtures;
  },

  getFixturesByLeague: async (
    league: number,
    season: number,
    limit?: number,
    range?: import("../providers/football/fixturesUtils").FixtureRange
  ) => {
    const resolvedLimit = limit ?? 10;
    const resolvedRange = range ?? "mixed";
    const extra = `l${resolvedLimit}:${resolvedRange}`;

    const fixtures = await loadLeagueListData(
      league,
      season,
      "fixtures",
      async (resolvedSeason) => {
        const loaded = await footballProviderManager.execute(
          "getFixturesByLeague",
          league,
          resolvedSeason,
          resolvedLimit,
          resolvedRange
        );
        await prewarmFixtureMappings(loaded);
        return attachDetailIds(loaded);
      },
      extra
    );
    return fixtures;
  },

  getMatchDetails: async (id: number) => {
    const lookupIds = resolveAlternateFixtureIds(id);
    const cachedComplete = await readCachedComplete(lookupIds);
    if (cachedComplete) {
      return buildMatchMeta(cachedComplete);
    }

    const cachedPartial = await readCachedPartial(lookupIds);

    try {
      const loaded = await loadMatchDetails(id);
      const result = buildMatchMeta(loaded);
      if (result.match && isWorthCaching(loaded)) {
        await persistEnrichedMatch(id, loaded);
      }
      return result;
    } catch (error) {
      if (cachedPartial) {
        console.warn(`[Football] Serving cached partial match details for ${id}`);
        return buildMatchMeta(cachedPartial);
      }

      for (const cacheId of lookupIds) {
        const stale = cache.getStale<MatchDetailsResult>(enrichedCacheKey(cacheId));
        if (stale?.match && hasAnyMatchDetails(stale)) {
          console.warn(`[Football] Serving stale enriched match details for ${cacheId}`);
          return buildMatchMeta(stale);
        }
        const disk = await persistentMatchCache.get(cacheId);
        if (disk?.match && hasAnyMatchDetails(disk)) {
          return buildMatchMeta(disk);
        }
      }
      throw error;
    }
  },

  getHeadToHead: (home: number, away: number) =>
    apiFootballProvider.getHeadToHead(home, away),

  getStandings: (league: number, season: number) =>
    loadLeagueListData(league, season, "standings", (resolvedSeason) =>
      footballProviderManager.execute("getStandings", league, resolvedSeason)
    ),

  getTopScorers: async (league: number, season: number) =>
    withPlayerPhotos(
      await loadLeagueListData(league, season, "scorers", (resolvedSeason) =>
        footballProviderManager.execute("getTopScorers", league, resolvedSeason)
      ),
      league,
      season
    ),

  getTopAssists: async (league: number, season: number) =>
    withPlayerPhotos(
      await loadLeagueListData(league, season, "assists", (resolvedSeason) =>
        footballProviderManager.execute("getTopAssists", league, resolvedSeason)
      ),
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

  getPlayer: async (id: number, season: number, name?: string): Promise<NormalizedPlayerProfile | null> => {
    let profile: NormalizedPlayerProfile | null = null;

    if (apiFootballProvider.isAvailable()) {
      try {
        profile = await apiFootballProvider.getPlayer(id, season);
      } catch {
        // fall through
      }
    }

    if (!profile && name?.trim()) {
      profile = await theSportsDbPlayerProvider.getPlayerByName(name.trim(), id);
    }

    const enriched = await enrichPlayerProfile(profile, id, name);
    return enriched;
  },

  search: (query: string) => footballProviderManager.searchMerged(query),

  getKnockoutBracket: async (league: number, season: number) => {
    if (league !== WORLD_CUP_LEAGUE_ID) {
      return Promise.resolve(null);
    }

    return loadKnockoutData(league, season, async (resolvedSeason) => {
      const bracket = await footballDataProvider.getKnockoutBracket(league, resolvedSeason);
      if (!bracket) return null;

      const allMatches: NormalizedMatch[] = [
        ...bracket.last32.left,
        ...bracket.last32.right,
        ...bracket.last16.left,
        ...bracket.last16.right,
        ...bracket.quarterFinals.left,
        ...bracket.quarterFinals.right,
        ...bracket.semiFinals.left,
        ...bracket.semiFinals.right,
        ...(bracket.final ? [bracket.final] : []),
        ...(bracket.thirdPlace ? [bracket.thirdPlace] : []),
      ].map((m) => ({
        id: m.id,
        date: m.date,
        timestamp: Math.floor(new Date(m.date).getTime() / 1000),
        status: m.status,
        league: { id: league, name: "FIFA World Cup", logo: "", country: "", round: "" },
        venue: { name: null, city: null },
        teams: {
          home: { id: m.home.id, name: m.home.name, logo: m.home.logo, winner: m.home.winner },
          away: { id: m.away.id, name: m.away.name, logo: m.away.logo, winner: m.away.winner },
        },
        goals: { home: m.home.score, away: m.away.score },
        source: "football-data" as const,
      }));

      await prewarmFixtureMappings(allMatches);

      const detailId = (fdId: number) => {
        const mapped = attachDetailFixtureIds([
          allMatches.find((m) => m.id === fdId)!,
        ])[0]?.detailFixtureId;
        return mapped && mapped !== fdId ? mapped : fdId;
      };

      const mapSide = (side: typeof bracket.last32) => ({
        left: side.left.map((m) => ({ ...m, id: detailId(m.id) })),
        right: side.right.map((m) => ({ ...m, id: detailId(m.id) })),
      });

      return {
        ...bracket,
        last32: mapSide(bracket.last32),
        last16: mapSide(bracket.last16),
        quarterFinals: mapSide(bracket.quarterFinals),
        semiFinals: mapSide(bracket.semiFinals),
        final: bracket.final ? { ...bracket.final, id: detailId(bracket.final.id) } : null,
        thirdPlace: bracket.thirdPlace
          ? { ...bracket.thirdPlace, id: detailId(bracket.thirdPlace.id) }
          : null,
      };
    });
  },
};
