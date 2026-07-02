import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { apiFootballProvider } from "./apiFootball.provider";
import { footballDataProvider } from "./footballData.provider";
import { isRateLimitError } from "./apiKeyPool";
import { WORLD_CUP_LEAGUE_ID } from "./leagueMap";
import type { FootballProvider } from "./football.types";

type ProviderMethod = Exclude<keyof FootballProvider, "name" | "isAvailable">;

const FOOTBALL_DATA_FIRST_METHODS: ProviderMethod[] = [
  "getTopScorers",
  "getTopAssists",
  "getStandings",
  "getFixturesByLeague",
];

/** Prefer football-data when API-Football free tier lacks the active season. */
function shouldPreferFootballData(method: ProviderMethod, args: unknown[]): boolean {
  if (!FOOTBALL_DATA_FIRST_METHODS.includes(method)) return false;

  const leagueId = typeof args[0] === "number" ? args[0] : undefined;
  if (leagueId === WORLD_CUP_LEAGUE_ID) return true;

  return env.footballDefaultSeason >= 2025;
}

function orderProviders(
  providers: FootballProvider[],
  method: ProviderMethod,
  args: unknown[]
): FootballProvider[] {
  const leagueId = typeof args[0] === "number" ? args[0] : undefined;

  if (
    leagueId === WORLD_CUP_LEAGUE_ID &&
    FOOTBALL_DATA_FIRST_METHODS.includes(method)
  ) {
    return providers.filter((p) => p.name === "football-data");
  }

  if (!shouldPreferFootballData(method, args)) return providers;

  return [...providers].sort((a, b) => {
    if (a.name === "football-data") return -1;
    if (b.name === "football-data") return 1;
    return 0;
  });
}

function shouldFailover(error: unknown): boolean {
  if (error instanceof AppError) {
    if (error.statusCode === 429 || error.statusCode === 403) return true;
    if (error.statusCode === 400) return isRateLimitError(error);
  }
  return isRateLimitError(error);
}

function mergeUniqueMatches(lists: import("./football.types").NormalizedMatch[][]) {
  const seen = new Set<string>();
  const merged: import("./football.types").NormalizedMatch[] = [];

  for (const list of lists) {
    for (const match of list) {
      const key = `${match.teams.home.name}-${match.teams.away.name}-${match.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(match);
    }
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Orchestrates multiple football data providers with automatic failover.
 * When one provider hits rate limits or quota errors, the next provider is tried.
 */
export class FootballProviderManager {
  private readonly providers: FootballProvider[];

  constructor(providers: FootballProvider[]) {
    this.providers = providers.filter((p) => p.isAvailable());
    if (this.providers.length > 0) {
      console.log(
        `[Football] Active providers: ${this.providers.map((p) => p.name).join(", ")}`
      );
    } else {
      console.warn("[Football] No football data providers configured");
    }
  }

  private available(): FootballProvider[] {
    return this.providers;
  }

  private emptyResult<M extends ProviderMethod>(
    method: M
  ): ReturnType<FootballProvider[M]> {
    if (method === "getMatchDetails") {
      return {
        match: null,
        statistics: [],
        events: [],
        lineups: [],
      } as ReturnType<FootballProvider[M]>;
    }
    if (method === "search") {
      return { teams: [], players: [] } as ReturnType<FootballProvider[M]>;
    }
    if (method === "getTeam" || method === "getPlayer") {
      return null as ReturnType<FootballProvider[M]>;
    }
    return [] as ReturnType<FootballProvider[M]>;
  }

  async execute<M extends ProviderMethod>(
    method: M,
    ...args: Parameters<FootballProvider[M]>
  ): Promise<ReturnType<FootballProvider[M]>> {
    const providers = orderProviders(this.available(), method, args);
    if (providers.length === 0) {
      return this.emptyResult(method);
    }

    let lastError: unknown;

    for (const provider of providers) {
      try {
        const result = await (
          provider[method] as (
            ...a: Parameters<FootballProvider[M]>
          ) => ReturnType<FootballProvider[M]>
        ).apply(provider, args);

        if (Array.isArray(result) && result.length > 0) {
          return result as ReturnType<FootballProvider[M]>;
        }

        if (!Array.isArray(result) && result) {
          return result as ReturnType<FootballProvider[M]>;
        }

        if (providers.indexOf(provider) < providers.length - 1) {
          continue;
        }

        return result as ReturnType<FootballProvider[M]>;
      } catch (error) {
        lastError = error;
        console.warn(`[Football] ${provider.name}.${method} failed:`, (error as Error).message);
        if (shouldFailover(error)) continue;
        throw error;
      }
    }

    if (lastError && shouldFailover(lastError)) {
      console.warn(`[Football] All providers exhausted for ${method} — returning empty data`);
      return this.emptyResult(method);
    }

    throw lastError instanceof Error
      ? lastError
      : new AppError("All football data providers failed", 503);
  }

  /** Merge live matches from all providers for maximum coverage. */
  async getLiveMatchesMerged() {
    const providers = this.available();
    const results = await Promise.all(
      providers.map((p) =>
        p.getLiveMatches().catch((err) => {
          console.warn(`[Football] ${p.name} live failed:`, err.message);
          return [];
        })
      )
    );
    return mergeUniqueMatches(results);
  }

  /** Merge search results from all providers. */
  async searchMerged(query: string) {
    const providers = this.available();
    const results = await Promise.all(
      providers.map((p) =>
        p.search(query).catch(() => ({ teams: [], players: [] }))
      )
    );

    return {
      teams: results.flatMap((r) => r.teams),
      players: results.flatMap((r) => r.players),
    };
  }
}

export const footballProviderManager = new FootballProviderManager([
  apiFootballProvider,
  footballDataProvider,
]);
