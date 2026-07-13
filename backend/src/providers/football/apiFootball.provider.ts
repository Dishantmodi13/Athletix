import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { cache } from "../../services/cache.service";
import { dateISOWithOffset } from "../../utils/footballSeason";
import { ApiKeyPool, isRateLimitError, parseKeyList } from "./apiKeyPool";
import { WORLD_CUP_LEAGUE_ID } from "./leagueMap";
import type {
  FootballProvider,
  MatchDetailsResult,
  NormalizedMatch,
  SearchResult,
  StandingGroup,
  StandingRow,
  TopScorer,
} from "./football.types";
import { toStandingGroups } from "./standingsUtils";

interface ApiFootballResponse<T> {
  errors: unknown;
  response: T;
}

interface RawFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long: string; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: { id: number; name: string; logo: string; country: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

import { FINISHED_STATUSES as FINISHED, pickLeagueFixtures, type FixtureRange } from "./fixturesUtils";
import { eventsFromApiFootball } from "./matchEventsUtils";
import { normalizeLineups } from "./lineupUtils";
import { normalizeApiFootballPlayer } from "./playerProfileUtils";
import type { NormalizedPlayerProfile } from "./playerProfile.types";

/** API-Football free tier only exposes recent seasons for club competitions. */
const API_FOOTBALL_FREE_MAX_SEASON = 2024;

function isSeasonAccessError(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  return error.message.toLowerCase().includes("do not have access to this season");
}

function apiFootballSeasonCandidates(league: number, season: number): number[] {
  if (league === WORLD_CUP_LEAGUE_ID) {
    return [...new Set([season, 2022, 2018].filter((y) => y > 0))];
  }

  const seasons = [season];
  if (season > API_FOOTBALL_FREE_MAX_SEASON) {
    seasons.push(API_FOOTBALL_FREE_MAX_SEASON);
  }
  if (season - 1 >= 2022 && !seasons.includes(season - 1)) {
    seasons.push(season - 1);
  }
  if (season - 2 >= 2022 && !seasons.includes(season - 2)) {
    seasons.push(season - 2);
  }
  return [...new Set(seasons.filter((y) => y >= 2022))];
}

function normalizeMatch(raw: RawFixture): NormalizedMatch {
  return {
    id: raw.fixture.id,
    date: raw.fixture.date,
    timestamp: raw.fixture.timestamp,
    status: raw.fixture.status,
    league: raw.league,
    venue: raw.fixture.venue,
    teams: raw.teams,
    goals: raw.goals,
    source: "api-football",
  };
}

export class ApiFootballProvider implements FootballProvider {
  readonly name = "api-football";
  private readonly keyPool: ApiKeyPool;

  constructor() {
    this.keyPool = new ApiKeyPool(
      parseKeyList(env.footballApiKeys, env.footballApiKey)
    );
  }

  isAvailable(): boolean {
    return this.keyPool.hasKeys();
  }

  private buildUrl(endpoint: string, params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, String(value));
      }
    });
    return `${env.footballApiBaseUrl}/${endpoint}?${query.toString()}`;
  }

  private async fetchFromApi<T>(url: string): Promise<T> {
    return this.keyPool.execute(async (apiKey) => {
      let res: Response;
      try {
        res = await fetch(url, {
          headers: { "x-apisports-key": apiKey },
        });
      } catch {
        throw new AppError("Unable to reach API-Football", 502);
      }

      if (res.status === 429) {
        throw new AppError("API-Football rate limit reached", 429);
      }

      if (!res.ok) {
        throw new AppError(`API-Football HTTP ${res.status}`, res.status);
      }

      const body = (await res.json()) as ApiFootballResponse<T>;

      if (
        body.errors &&
        typeof body.errors === "object" &&
        Object.keys(body.errors).length > 0
      ) {
        const firstError = Object.values(body.errors)[0];
        throw new AppError(
          typeof firstError === "string" ? firstError : "API-Football request failed",
          400
        );
      }

      return body.response;
    }, isRateLimitError);
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    ttlSeconds = 60
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const cacheKey = `af:${url}`;

    const cached = cache.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const value = await this.fetchFromApi<T>(url);
      cache.set(cacheKey, value, ttlSeconds);
      return value;
    } catch (error) {
      if (isRateLimitError(error)) {
        const stale = cache.getStale<T>(cacheKey);
        if (stale !== undefined) {
          console.warn(`[API-Football] Serving stale cache for ${endpoint}`);
          return stale;
        }
      }
      throw error;
    }
  }

  private async requestWithSeasonFallback<T>(
    endpoint: string,
    league: number,
    season: number,
    ttlSeconds: number,
    extraParams: Record<string, string | number | undefined> = {}
  ): Promise<T> {
    const seasons = apiFootballSeasonCandidates(league, season);
    let lastError: unknown;

    for (const year of seasons) {
      try {
        return await this.request<T>(
          endpoint,
          { league, season: year, ...extraParams },
          ttlSeconds
        );
      } catch (error) {
        lastError = error;
        if (isSeasonAccessError(error)) continue;
        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AppError("API-Football season unavailable", 400);
  }

  async getLiveMatches(): Promise<NormalizedMatch[]> {
    const data = await this.request<RawFixture[]>("fixtures", { live: "all" }, 25);
    return data.map(normalizeMatch);
  }

  async getFixturesByDate(date: string): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<RawFixture[]>("fixtures", { date }, 120);
      return data.map(normalizeMatch);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      if (error instanceof AppError) return [];
      throw error;
    }
  }

  async getAllLeagueFixtures(league: number, season: number): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<RawFixture[]>("fixtures", { league, season }, 86_400);
      return data.map(normalizeMatch);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      return [];
    }
  }

  async getFixturesInRange(
    league: number,
    season: number,
    from: string,
    to: string
  ): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<RawFixture[]>(
        "fixtures",
        { league, season, from, to },
        3600
      );
      return data.map(normalizeMatch);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      return [];
    }
  }

  async getFixturesByLeague(
    league: number,
    season: number,
    limit = 10,
    range: FixtureRange = "mixed"
  ): Promise<NormalizedMatch[]> {
    if (range === "recent") {
      try {
        const recent = await this.requestWithSeasonFallback<RawFixture[]>(
          "fixtures",
          league,
          season,
          120,
          { last: limit }
        );
        if (recent.length > 0) {
          return recent
            .map(normalizeMatch)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        }
      } catch (error) {
        if (error instanceof AppError && isRateLimitError(error)) throw error;
      }
      return [];
    }

    if (range === "upcoming") {
      try {
        const upcoming = await this.requestWithSeasonFallback<RawFixture[]>(
          "fixtures",
          league,
          season,
          120,
          { next: limit }
        );
        if (upcoming.length > 0) {
          return upcoming.map(normalizeMatch).slice(0, limit);
        }
      } catch (error) {
        if (error instanceof AppError && isRateLimitError(error)) throw error;
      }
      return [];
    }

    try {
      const upcoming = await this.requestWithSeasonFallback<RawFixture[]>(
        "fixtures",
        league,
        season,
        120,
        { next: limit }
      );
      if (upcoming.length > 0) {
        return upcoming.map(normalizeMatch);
      }

      const recent = await this.requestWithSeasonFallback<RawFixture[]>(
        "fixtures",
        league,
        season,
        120,
        { last: limit }
      );
      if (recent.length > 0) {
        return recent
          .map(normalizeMatch)
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
    }

    const dates = Array.from({ length: 3 }, (_, i) => dateISOWithOffset(i));
    const batches = await Promise.all(dates.map((d) => this.getFixturesByDate(d)));
    return batches
      .flat()
      .filter((m) => m.league.id === league && !FINISHED.has(m.status.short))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, limit);
  }

  async getStandings(league: number, season: number): Promise<StandingGroup[]> {
    const data = await this.requestWithSeasonFallback<
      Array<{ league: { standings: Array<Array<StandingRow & { group?: string }>> } }>
    >("standings", league, season, 600);

    const tables = data[0]?.league?.standings ?? [];
    return toStandingGroups(
      tables.map((rows) => ({
        name: rows[0]?.group,
        rows: [...(rows as StandingRow[])].sort((a, b) => a.rank - b.rank),
      }))
    );
  }

  async getTopScorers(league: number, season: number): Promise<TopScorer[]> {
    if (league === WORLD_CUP_LEAGUE_ID) return [];
    return this.requestWithSeasonFallback<TopScorer[]>(
      "players/topscorers",
      league,
      season,
      600
    );
  }

  async getTopAssists(league: number, season: number): Promise<TopScorer[]> {
    if (league === WORLD_CUP_LEAGUE_ID) return [];
    return this.requestWithSeasonFallback<TopScorer[]>(
      "players/topassists",
      league,
      season,
      600
    );
  }

  /** Fetch scorer/assist lists from API-Football for player photo lookup. */
  async getScorerPhotoCatalog(league: number, season: number): Promise<TopScorer[]> {
    const catalogKey = `af:photo-catalog:v1:${league}:${season}`;
    const cached = cache.get<TopScorer[]>(catalogKey);
    if (cached?.length) return cached;

    const seasons =
      league === WORLD_CUP_LEAGUE_ID
        ? [2022, 2018, season]
        : [season, season - 1];

    const uniqueSeasons = [...new Set(seasons.filter((y) => y > 0))];
    const merged: TopScorer[] = [];

    for (const year of uniqueSeasons) {
      try {
        const scorers = await this.fetchFromApi<TopScorer[]>(
          this.buildUrl("players/topscorers", { league, season: year })
        ).catch(() => [] as TopScorer[]);

        merged.push(...scorers);

        if (!merged.some((row) => row.player.photo?.trim())) {
          const assists = await this.fetchFromApi<TopScorer[]>(
            this.buildUrl("players/topassists", { league, season: year })
          ).catch(() => [] as TopScorer[]);
          merged.push(...assists);
        }

        if (merged.some((row) => row.player.photo?.trim())) break;
      } catch {
        continue;
      }
    }

    if (merged.some((row) => row.player.photo?.trim())) {
      cache.set(catalogKey, merged, 86_400);
    }

    return merged;
  }

  async getMatchDetails(id: number): Promise<MatchDetailsResult> {
    const detailCacheKey = `af:match-details:v1:${id}`;
    const cached = cache.get<MatchDetailsResult>(detailCacheKey);
    if (cached?.match) return cached;

    try {
      const [fixture, statistics, events, lineups] = await Promise.all([
        this.request<RawFixture[]>("fixtures", { id }, 300),
        this.request<unknown[]>("fixtures/statistics", { fixture: id }, 3600).catch(() => []),
        this.request<unknown[]>("fixtures/events", { fixture: id }, 3600).catch(() => []),
        this.request<unknown[]>("fixtures/lineups", { fixture: id }, 86_400).catch(() => []),
      ]);

      const result: MatchDetailsResult = {
        match: fixture[0] ? normalizeMatch(fixture[0]) : null,
        statistics,
        events: eventsFromApiFootball(events as unknown[]),
        lineups: normalizeLineups(lineups as unknown[]),
      };

      if (result.match && (result.lineups.length > 0 || result.events.length > 0)) {
        cache.set(detailCacheKey, result, 86_400);
      }

      return result;
    } catch (error) {
      const stale = cache.getStale<MatchDetailsResult>(detailCacheKey);
      if (stale?.match) {
        console.warn(`[API-Football] Serving stale match details for fixture ${id}`);
        return stale;
      }
      throw error;
    }
  }

  async getTeam(id: number): Promise<unknown> {
    const data = await this.request<unknown[]>("teams", { id }, 86400);
    return data[0] ?? null;
  }

  async getTeamFixtures(team: number, season: number): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<RawFixture[]>("fixtures", { team, season }, 300);
      return data
        .map(normalizeMatch)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  async getPlayer(id: number, season: number): Promise<NormalizedPlayerProfile | null> {
    const cacheKey = `af:player-profile:v2:${id}`;
    const cached = cache.get<NormalizedPlayerProfile>(cacheKey);
    if (cached) return cached;

    let profilePlayer: Parameters<typeof normalizeApiFootballPlayer>[0] = null;
    try {
      const profiles = await this.request<{ player: NonNullable<Parameters<typeof normalizeApiFootballPlayer>[0]> }[]>(
        "players/profiles",
        { player: id },
        86_400
      );
      profilePlayer = profiles[0]?.player ?? null;
    } catch {
      // continue with season stats only
    }

    const seasons = [...new Set([season, 2026, 2024, 2022, season - 1, 2023].filter((y) => y > 0))];
    let statsRow: Parameters<typeof normalizeApiFootballPlayer>[1] = null;

    for (const year of seasons) {
      try {
        const data = await this.fetchFromApi<Parameters<typeof normalizeApiFootballPlayer>[1][]>(
          this.buildUrl("players", { id, season: year })
        );
        if (data[0]) {
          statsRow = data[0];
          if ((data[0].statistics?.length ?? 0) > 0) break;
        }
      } catch {
        continue;
      }
    }

    const normalized = normalizeApiFootballPlayer(profilePlayer, statsRow, id);
    if (!normalized) return null;

    cache.set(cacheKey, normalized, 86_400);
    return normalized;
  }

  async search(query: string): Promise<SearchResult> {
    const [teams, players] = await Promise.all([
      this.request<unknown[]>("teams", { search: query }, 600),
      this.request<unknown[]>("players/profiles", { search: query }, 600).catch(
        () => [] as unknown[]
      ),
    ]);
    return { teams, players };
  }

  async searchTeams(query: string): Promise<Array<{ id: number; name: string }>> {
    try {
      const data = await this.request<Array<{ team: { id: number; name: string } }>>(
        "teams",
        { search: query },
        86_400
      );
      return data.map((row) => row.team).filter((t) => t?.id);
    } catch {
      return [];
    }
  }

  async findHeadToHeadFixtureId(
    homeId: number,
    awayId: number,
    targetDate: string
  ): Promise<number | null> {
    try {
      const data = await this.request<RawFixture[]>(
        "fixtures/headtohead",
        { h2h: `${homeId}-${awayId}`, last: 5 },
        3600
      );
      const targetDay = targetDate.split("T")[0];
      const onDay = data.find((f) => f.fixture.date.startsWith(targetDay));
      return (onDay ?? data[0])?.fixture.id ?? null;
    } catch {
      return null;
    }
  }

  async getHeadToHead(home: number, away: number): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<RawFixture[]>(
        "fixtures/headtohead",
        { h2h: `${home}-${away}`, last: 10 },
        600
      );
      return data.map(normalizeMatch);
    } catch {
      return [];
    }
  }

  async getLeagues(): Promise<unknown[]> {
    try {
      return await this.request<unknown[]>("leagues", { current: "true" }, 86400);
    } catch {
      return [];
    }
  }
}

export const apiFootballProvider = new ApiFootballProvider();
