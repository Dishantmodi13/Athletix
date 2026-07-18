import { footballProviderManager } from "../providers/football/footballProvider.manager";
import { apiFootballProvider } from "../providers/football/apiFootball.provider";
import { footballDataProvider } from "../providers/football/footballData.provider";
import { loadTopAssists } from "../providers/football/topAssistsResolver";
import { WORLD_CUP_LEAGUE_ID } from "../providers/football/leagueMap";
import { mergeScorerPhotos } from "../providers/football/scorerPhotoUtils";
import { enrichTopScorerPhotos } from "../providers/football/scorerPhotoEnrichment";
import {
  parseApiFootballFixturePlayers,
  photoFromLineups,
  resolveFootballPlayerOfTheMatch,
} from "../providers/football/playerOfTheMatch";
import {
  attachDetailFixtureIds,
  cacheFdToAfMapping,
  dedupeMatchesByFixture,
  findApiFootballFixtureId,
  prewarmFixtureMappings,
  resolveAlternateFixtureIds,
} from "../providers/football/matchLookupUtils";
import {
  lineupStarterCount,
  needsLineupEnrichment,
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
import { synthesizeLineupGrids, type NormalizedLineup } from "../providers/football/lineupUtils";
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
import { resolveFootballSeason } from "../utils/footballSeason";
import {
  matchIncludesFollowedTeam,
  normalizeTeamName,
  parseFollowedTeamsQuery,
  type FollowedTeamInput,
} from "../utils/followedTeams";
import type { MatchDetailsResult, NormalizedMatch, StandingGroup, StandingRow, TopScorer } from "../providers/football/football.types";

export type { NormalizedMatch, MatchDetailsResult, NormalizedMatchEvent, StandingGroup } from "../providers/football/football.types";
export type { KnockoutBracketData } from "../providers/football/knockoutUtils";

const TOP_FIVE_LEAGUE_IDS = [39, 140, 135, 78, 61] as const;
const WORLD_CUP_END = new Date("2026-07-20T23:59:59");

function isWorldCupFocusActive(): boolean {
  return new Date() < WORLD_CUP_END;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

interface TeamProfile {
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
    founded: number | null;
  };
  venue: { name: string | null; city: string | null; capacity: number | null };
}

function matchesTeamInMatch(
  match: NormalizedMatch,
  id: number,
  nameHint?: string
): "home" | "away" | null {
  if (match.teams.home.id === id) return "home";
  if (match.teams.away.id === id) return "away";
  if (!nameHint) return null;

  const norm = normalizeTeamName(nameHint);
  if (normalizeTeamName(match.teams.home.name) === norm) return "home";
  if (normalizeTeamName(match.teams.away.name) === norm) return "away";
  return null;
}

function profileFromMatchSide(
  match: NormalizedMatch,
  side: "home" | "away",
  fallbackId: number
): TeamProfile {
  const team = side === "home" ? match.teams.home : match.teams.away;
  return {
    team: {
      id: team.id || fallbackId,
      name: team.name,
      logo: team.logo,
      country: match.league.country || "",
      founded: null,
    },
    venue: {
      name: match.venue?.name ?? null,
      city: match.venue?.city ?? null,
      capacity: null,
    },
  };
}

function profileMatchesPool(
  profile: TeamProfile,
  id: number,
  poolFixtures: NormalizedMatch[]
): boolean {
  for (const match of poolFixtures) {
    const side = matchesTeamInMatch(match, id);
    if (!side) continue;
    const name = side === "home" ? match.teams.home.name : match.teams.away.name;
    if (normalizeTeamName(profile.team.name) === normalizeTeamName(name)) return true;
  }
  return false;
}

function isUsableTeamProfile(
  profile: TeamProfile | null | undefined,
  id: number,
  nameHint?: string,
  poolFixtures: NormalizedMatch[] = []
): profile is TeamProfile {
  if (!profile?.team?.name) return false;
  if (nameHint) {
    return normalizeTeamName(profile.team.name) === normalizeTeamName(nameHint);
  }
  if (poolFixtures.length > 0) {
    return profileMatchesPool(profile, id, poolFixtures);
  }
  return profile.team.id === id;
}

function profileFromStandingRow(row: StandingRow, fallbackId: number): TeamProfile {
  return {
    team: {
      id: row.team.id || fallbackId,
      name: row.team.name,
      logo: row.team.logo,
      country: "",
      founded: null,
    },
    venue: { name: null, city: null, capacity: null },
  };
}

async function resolveTeamProfileFromStandings(
  id: number,
  nameHint?: string
): Promise<TeamProfile | null> {
  const leagues = isWorldCupFocusActive()
    ? [WORLD_CUP_LEAGUE_ID]
    : [39, 140, 135, 78, 61, 2, 3];

  for (const league of leagues) {
    try {
      const season = resolveFootballSeason(undefined, league);
      const standings = await footballService.getStandings(league, season);
      for (const group of standings) {
        for (const row of group.rows) {
          if (row.team.id === id) {
            return profileFromStandingRow(row, id);
          }
          if (nameHint && normalizeTeamName(row.team.name) === normalizeTeamName(nameHint)) {
            return profileFromStandingRow(row, id);
          }
        }
      }
    } catch {
      // try next league
    }
  }

  return null;
}

async function resolveTeamProfileFromSearch(
  nameHint: string,
  season: number
): Promise<{ profile: TeamProfile | null; fixtures: NormalizedMatch[] }> {
  const providers = [
    footballDataProvider.isAvailable() ? footballDataProvider : null,
    apiFootballProvider.isAvailable() ? apiFootballProvider : null,
  ].filter(Boolean) as Array<{
    search: (query: string) => Promise<{ teams: unknown[] }>;
    getTeam: (id: number) => Promise<unknown>;
    getTeamFixtures?: (team: number, season: number) => Promise<NormalizedMatch[]>;
  }>;

  for (const provider of providers) {
    try {
      const search = await provider.search(nameHint);
      const hit = (
        search.teams as Array<{ team: { id: number; name: string } }>
      ).find((row) => normalizeTeamName(row.team.name) === normalizeTeamName(nameHint));
      if (!hit?.team.id) continue;

      const profile = (await provider.getTeam(hit.team.id)) as TeamProfile | null;
      if (!isUsableTeamProfile(profile, hit.team.id, nameHint)) continue;

      let fixtures: NormalizedMatch[] = [];
      if (provider.getTeamFixtures) {
        fixtures = await provider.getTeamFixtures(hit.team.id, season);
      } else {
        fixtures = await footballService.getTeamFixtures(hit.team.id, season);
      }

      return { profile, fixtures };
    } catch {
      // try next provider
    }
  }

  return { profile: null, fixtures: [] };
}

export interface FootballHomePayload {
  worldCupFocus: boolean;
  defaultLeague: number;
  live: NormalizedMatch[];
  today: NormalizedMatch[];
  featuredUpcoming: NormalizedMatch[];
  featuredRecent: NormalizedMatch[];
  standings: StandingGroup[];
  scorers: TopScorer[];
  sidebarUpcoming: NormalizedMatch[];
  sidebarScorers: TopScorer[];
}

function emptyMatchDetails(): MatchDetailsResult {
  return { match: null, statistics: [], events: [], lineups: [], playerOfTheMatch: null };
}

function normalizeMatchDetails(result: MatchDetailsResult): MatchDetailsResult {
  if (!result.match) return result;
  const lineups = (result.lineups as NormalizedLineup[]).map(synthesizeLineupGrids);
  return {
    ...result,
    lineups,
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
  return `match:enriched:v8:${id}`;
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
    if (
      mem?.match &&
      isCompleteMatchDetails(mem) &&
      !needsLineupEnrichment(mem.lineups)
    ) {
      return mem;
    }

    const disk = await persistentMatchCache.get(id);
    if (
      disk?.match &&
      isCompleteMatchDetails(disk) &&
      !needsLineupEnrichment(disk.lineups)
    ) {
      return disk;
    }
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

  const missingLineups = needsLineupEnrichment(result.lineups);
  if (isCompleteMatchDetails(result) && !missingLineups) {
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

  const shouldUseTheSportsDb =
    current.match &&
    (!isCompleteMatchDetails(current) || needsLineupEnrichment(current.lineups));

  if (shouldUseTheSportsDb && current.match) {
    const match = current.match;
    const tsdb = await theSportsDbProvider.getMatchDetails(match);
    const mergedEvents = sanitizeMatchEvents(
      mergeEventTimelines(current.events, tsdb.events),
      match
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

  if (needsLineupEnrichment(current.lineups)) {
    current = await enrichMatchDetails(current);
  }

  return current;
}

async function loadMatchDetails(id: number): Promise<MatchDetailsResult> {
  if (footballDataProvider.isAvailable()) {
    try {
      const fd = await footballDataProvider.getMatchDetails(id);
      if (fd.match) {
        const result = await enrichWithFallbacks(fd);
        return attachPlayerOfTheMatch(result, id);
      }
    } catch {
      // fall through
    }
  }

  if (apiFootballProvider.isAvailable()) {
    try {
      const af = await apiFootballProvider.getMatchDetails(id);
      if (af.match) {
        const result = await enrichWithFallbacks(af);
        return attachPlayerOfTheMatch(result, id);
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
        const result = await enrichWithFallbacks(af);
        return attachPlayerOfTheMatch(result, id);
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

async function attachPlayerOfTheMatch(
  result: MatchDetailsResult,
  requestId: number
): Promise<MatchDetailsResult> {
  if (!result.match) return result;
  if (result.playerOfTheMatch) return result;

  const lookupIds = resolveAlternateFixtureIds(requestId);
  let fixtureStats: ReturnType<typeof parseApiFootballFixturePlayers> = [];

  if (apiFootballProvider.isAvailable()) {
    for (const id of lookupIds) {
      try {
        const raw = await apiFootballProvider.getFixturePlayerStats(id);
        const parsed = parseApiFootballFixturePlayers(raw);
        if (parsed.some((row) => row.rating !== null)) {
          fixtureStats = parsed;
          break;
        }
      } catch {
        // try next id
      }
    }
  }

  let playerOfTheMatch = resolveFootballPlayerOfTheMatch(result, fixtureStats);
  if (!playerOfTheMatch) return result;

  if (!playerOfTheMatch.player.photo?.trim()) {
    const lineupPhoto = photoFromLineups(
      result.lineups,
      playerOfTheMatch.player.name,
      playerOfTheMatch.team.id
    );
    if (lineupPhoto) {
      playerOfTheMatch = {
        ...playerOfTheMatch,
        player: { ...playerOfTheMatch.player, photo: lineupPhoto },
      };
    } else {
      try {
        const profile = await theSportsDbPlayerProvider.getPlayerByName(
          playerOfTheMatch.player.name,
          playerOfTheMatch.player.id > 0 ? playerOfTheMatch.player.id : undefined
        );
        const photo = profile?.player.photo?.trim();
        if (photo && profile) {
          playerOfTheMatch = {
            ...playerOfTheMatch,
            player: {
              ...playerOfTheMatch.player,
              id: profile.player.id || playerOfTheMatch.player.id,
              photo,
            },
          };
        }
      } catch {
        // keep initials fallback on frontend
      }
    }
  }

  return { ...result, playerOfTheMatch };
}

async function withPlayerPhotos(
  rows: TopScorer[],
  league: number,
  season: number
): Promise<TopScorer[]> {
  if (!rows.length) return rows;

  if (!apiFootballProvider.isAvailable()) {
    return enrichTopScorerPhotos(rows, league, season, async () => []);
  }

  return enrichTopScorerPhotos(rows, league, season, () =>
    apiFootballProvider.getScorerPhotoCatalog(league, season)
  );
}

/**
 * Football data service — delegates to the multi-provider manager
 * with automatic failover between API-Football and football-data.org.
 */
export const footballService = {
  getLiveMatches: async () =>
    cache.wrapStale("football:live:v3", 25, async () => {
      const fixtures = await footballProviderManager.getLiveMatchesMerged();
      await prewarmFixtureMappings(fixtures);
      return attachDetailIds(fixtures);
    }),

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
      return buildMatchMeta(await attachPlayerOfTheMatch(cachedComplete, id));
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
        return buildMatchMeta(await attachPlayerOfTheMatch(cachedPartial, id));
      }

      for (const cacheId of lookupIds) {
        const stale = cache.getStale<MatchDetailsResult>(enrichedCacheKey(cacheId));
        if (stale?.match && hasAnyMatchDetails(stale)) {
          console.warn(`[Football] Serving stale enriched match details for ${cacheId}`);
          return buildMatchMeta(await attachPlayerOfTheMatch(stale, id));
        }
        const disk = await persistentMatchCache.get(cacheId);
        if (disk?.match && hasAnyMatchDetails(disk)) {
          return buildMatchMeta(await attachPlayerOfTheMatch(disk, id));
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

  getTopAssists: async (league: number, season: number) => {
    const key = leagueCacheKey("assists:v5", league, season);
    const rows = await withPersistentLeagueData(key, () => loadTopAssists(league, season));

    return withPlayerPhotos(rows, league, season);
  },

  getLeagues: () => apiFootballProvider.getLeagues(),

  getTeam: async (id: number) =>
    cache.wrapStale(`football:team:v2:${id}`, 300, async () => {
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
    }),

  getTeamFixtures: async (team: number, season: number) =>
    cache.wrapStale(`football:team-fixtures:v1:${team}:${season}`, 120, async () => {
      if (footballDataProvider.isAvailable()) {
        try {
          const fd = await footballDataProvider.getTeamFixtures(team, season);
          if (fd.length > 0) return fd;
        } catch {
          // fall through
        }
      }

      return footballProviderManager.execute("getTeamFixtures", team, season);
    }),

  getTeamPage: async (id: number, season: number, nameHint?: string) => {
    const cacheKey = `football:team-page:v3:${id}:${season}:${normalizeTeamName(nameHint ?? "")}`;
    return cache.wrapStale(cacheKey, 120, async () => {
      let profile = (await footballService.getTeam(id)) as TeamProfile | null;
      let fixtures = await footballService.getTeamFixtures(id, season);

      const date = todayISO();
      const wcSeason = resolveFootballSeason(undefined, WORLD_CUP_LEAGUE_ID);
      const [live, today, wcUpcoming, wcRecent] = await Promise.all([
        footballService.getLiveMatches(),
        footballService.getFixturesByDate(date),
        isWorldCupFocusActive()
          ? footballService.getFixturesByLeague(WORLD_CUP_LEAGUE_ID, wcSeason, 50, "upcoming")
          : Promise.resolve([] as NormalizedMatch[]),
        isWorldCupFocusActive()
          ? footballService.getFixturesByLeague(WORLD_CUP_LEAGUE_ID, wcSeason, 30, "recent")
          : Promise.resolve([] as NormalizedMatch[]),
      ]);

      const pool = dedupeMatchesByFixture([...live, ...today, ...wcUpcoming, ...wcRecent]);

      const poolFixtures = pool
        .filter((match) => matchesTeamInMatch(match, id, nameHint))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (poolFixtures.length > 0) {
        if (fixtures.length === 0) {
          fixtures = poolFixtures.slice(0, 12);
        }
        if (!isUsableTeamProfile(profile, id, nameHint, poolFixtures)) {
          const side = matchesTeamInMatch(poolFixtures[0], id, nameHint);
          if (side) {
            profile = profileFromMatchSide(poolFixtures[0], side, id);
          }
        }
      }

      if (!isUsableTeamProfile(profile, id, nameHint, poolFixtures) && nameHint) {
        const searched = await resolveTeamProfileFromSearch(nameHint, season);
        if (searched.profile) {
          profile = searched.profile;
        }
        if (fixtures.length === 0 && searched.fixtures.length > 0) {
          fixtures = searched.fixtures;
        }
      }

      if (!isUsableTeamProfile(profile, id, nameHint, poolFixtures)) {
        const fromStandings = await resolveTeamProfileFromStandings(id, nameHint);
        if (fromStandings) {
          profile = fromStandings;
        }
      }

      return { team: isUsableTeamProfile(profile, id, nameHint, poolFixtures) ? profile : null, fixtures };
    });
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

  getHomeDashboard: async (leagueId?: number): Promise<FootballHomePayload> => {
    const worldCupFocus = isWorldCupFocusActive();
    const defaultLeague =
      leagueId ?? (worldCupFocus ? WORLD_CUP_LEAGUE_ID : TOP_FIVE_LEAGUE_IDS[0]);
    const date = todayISO();
    const cacheKey = `football:home:v2:${defaultLeague}:${date}:${worldCupFocus ? "wc" : "top"}`;

    return cache.wrapStale(cacheKey, 45, async () => {
      const defaultSeason = resolveFootballSeason(undefined, defaultLeague);
      const sidebarLeague = worldCupFocus ? WORLD_CUP_LEAGUE_ID : TOP_FIVE_LEAGUE_IDS[0];
      const sidebarSeason = resolveFootballSeason(undefined, sidebarLeague);

      const livePromise = footballService.getLiveMatches();
      const todayPromise = footballService.getFixturesByDate(date);

      let featuredUpcomingPromise: Promise<NormalizedMatch[]>;
      let featuredRecentPromise: Promise<NormalizedMatch[]>;

      if (worldCupFocus) {
        const wcSeason = resolveFootballSeason(undefined, WORLD_CUP_LEAGUE_ID);
        featuredUpcomingPromise = footballService.getFixturesByLeague(
          WORLD_CUP_LEAGUE_ID,
          wcSeason,
          8,
          "upcoming"
        );
        featuredRecentPromise = footballService.getFixturesByLeague(
          WORLD_CUP_LEAGUE_ID,
          wcSeason,
          8,
          "recent"
        );
      } else {
        featuredUpcomingPromise = Promise.all(
          TOP_FIVE_LEAGUE_IDS.map((id) =>
            footballService.getFixturesByLeague(
              id,
              resolveFootballSeason(undefined, id),
              4,
              "upcoming"
            )
          )
        ).then((batches) =>
          batches
            .flat()
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(0, 8)
        );
        featuredRecentPromise = Promise.all(
          TOP_FIVE_LEAGUE_IDS.map((id) =>
            footballService.getFixturesByLeague(
              id,
              resolveFootballSeason(undefined, id),
              4,
              "recent"
            )
          )
        ).then((batches) =>
          batches
            .flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 8)
        );
      }

      const standingsPromise = footballService.getStandings(defaultLeague, defaultSeason);
      const scorersPromise = footballService.getTopScorers(defaultLeague, defaultSeason);
      const sidebarScorersPromise =
        sidebarLeague === defaultLeague
          ? scorersPromise
          : footballService.getTopScorers(sidebarLeague, sidebarSeason);

      const [
        live,
        today,
        featuredUpcoming,
        featuredRecent,
        standings,
        scorers,
        sidebarScorers,
      ] = await Promise.all([
        livePromise,
        todayPromise,
        featuredUpcomingPromise,
        featuredRecentPromise,
        standingsPromise,
        scorersPromise,
        sidebarScorersPromise,
      ]);

      return {
        worldCupFocus,
        defaultLeague,
        live,
        today,
        featuredUpcoming,
        featuredRecent,
        standings,
        scorers,
        sidebarUpcoming: featuredUpcoming.slice(0, 4),
        sidebarScorers: sidebarScorers.slice(0, 5),
      };
    });
  },

  getFollowedTeamMatches: async (followed: FollowedTeamInput[]) => {
    if (followed.length === 0) return [];

    const cacheKey = `football:followed:v4:${followed
      .map((team) => `${team.id}:${normalizeTeamName(team.name)}`)
      .sort()
      .join("|")}`;

    return cache.wrapStale(cacheKey, 30, async () => {
      const home = await footballService.getHomeDashboard();
      let pool = [
        ...home.live,
        ...home.today,
        ...home.featuredUpcoming,
        ...home.featuredRecent,
      ];

      if (isWorldCupFocusActive()) {
        const wcSeason = resolveFootballSeason(undefined, WORLD_CUP_LEAGUE_ID);
        const [wcUpcoming, wcRecent] = await Promise.all([
          footballService.getFixturesByLeague(WORLD_CUP_LEAGUE_ID, wcSeason, 40, "upcoming"),
          footballService.getFixturesByLeague(WORLD_CUP_LEAGUE_ID, wcSeason, 20, "recent"),
        ]);
        pool = [...pool, ...wcUpcoming, ...wcRecent];
      }

      const unique = dedupeMatchesByFixture(pool);

      const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
      const FINISHED = new Set(["FT", "AET", "PEN"]);

      return unique
        .filter((match) => matchIncludesFollowedTeam(match, followed))
        .filter(
          (match) =>
            LIVE.has(match.status.short) ||
            (!LIVE.has(match.status.short) && !FINISHED.has(match.status.short))
        )
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 12);
    });
  },
};
