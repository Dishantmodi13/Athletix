import { WORLD_CUP_LEAGUE_ID } from "../providers/football/leagueMap";
import { cache } from "./cache.service";
import { persistentLeagueCache } from "./persistentLeagueCache";
import { footballProviderManager } from "../providers/football/footballProvider.manager";
import { resolveFootballSeason } from "../utils/footballSeason";

/** Leagues that should keep standings/fixtures/scorers available offline. */
export const PERSISTENT_LEAGUE_IDS = new Set([39, 140, 135, 78, 61, 2, 3, WORLD_CUP_LEAGUE_ID]);

export function leagueCacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

export function candidateSeasons(league: number, season: number): number[] {
  if (league === WORLD_CUP_LEAGUE_ID) return [season];
  return [...new Set([season, season - 1, season - 2].filter((y) => y > 2000))];
}

function hasArrayData<T>(value: T): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasKnockoutData<T>(value: T): boolean {
  return value !== null && value !== undefined;
}

async function backfillDiskCache<T>(cacheKey: string, value: T): Promise<void> {
  try {
    await persistentLeagueCache.set(cacheKey, value);
  } catch (error) {
    console.warn(`[Football] Failed to persist league cache for ${cacheKey}:`, error);
  }
}

/**
 * Fetch league data from live APIs, persist successful responses to disk,
 * and serve cached snapshots when providers are rate-limited or offline.
 */
export async function withPersistentLeagueData<T>(
  cacheKey: string,
  loader: () => Promise<T>,
  hasData: (value: T) => boolean = hasArrayData as (value: T) => boolean
): Promise<T> {
  const memoryKey = `league:persist:v1:${cacheKey}`;
  let fresh: T;

  try {
    fresh = await loader();
    if (hasData(fresh)) {
      cache.set(memoryKey, fresh, 6 * 3600);
      await persistentLeagueCache.set(cacheKey, fresh);
      return fresh;
    }
  } catch (error) {
    const disk = await persistentLeagueCache.get<T>(cacheKey);
    if (disk && hasData(disk)) {
      console.warn(`[Football] Serving persistent league cache for ${cacheKey}`);
      cache.set(memoryKey, disk, 6 * 3600);
      return disk;
    }

    const stale = cache.getStale<T>(memoryKey);
    if (stale && hasData(stale)) {
      console.warn(`[Football] Serving in-memory league cache for ${cacheKey}`);
      await backfillDiskCache(cacheKey, stale);
      return stale;
    }

    throw error;
  }

  const disk = await persistentLeagueCache.get<T>(cacheKey);
  if (disk && hasData(disk)) {
    console.warn(`[Football] Serving persistent league cache (empty live) for ${cacheKey}`);
    cache.set(memoryKey, disk, 6 * 3600);
    return disk;
  }

  const stale = cache.getStale<T>(memoryKey);
  if (stale && hasData(stale)) {
    await backfillDiskCache(cacheKey, stale);
    return stale;
  }

  return fresh;
}

export async function loadLeagueListData<T>(
  league: number,
  season: number,
  type: string,
  loader: (resolvedSeason: number) => Promise<T>,
  extra = ""
): Promise<T> {
  const suffix = extra ? `:${extra}` : "";

  for (const resolvedSeason of candidateSeasons(league, season)) {
    const key = leagueCacheKey(type, league, resolvedSeason) + suffix;
    const result = await withPersistentLeagueData(
      key,
      () => loader(resolvedSeason),
      hasArrayData
    );
    if (hasArrayData(result)) return result;
  }

  const fallbackKey = leagueCacheKey(type, league, season) + suffix;
  return withPersistentLeagueData(fallbackKey, () => loader(season), hasArrayData);
}

export async function loadKnockoutData<T>(
  league: number,
  season: number,
  loader: (resolvedSeason: number) => Promise<T>
): Promise<T> {
  for (const resolvedSeason of candidateSeasons(league, season)) {
    const key = leagueCacheKey("knockout", league, resolvedSeason);
    const result = await withPersistentLeagueData(
      key,
      () => loader(resolvedSeason),
      hasKnockoutData
    );
    if (hasKnockoutData(result)) return result;
  }

  const fallbackKey = leagueCacheKey("knockout", league, season);
  return withPersistentLeagueData(fallbackKey, () => loader(season), hasKnockoutData);
}

const FEATURED_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3, WORLD_CUP_LEAGUE_ID];

/** Populate disk snapshots for featured leagues when cache files are missing. */
export async function warmFeaturedLeagueCaches(): Promise<void> {
  const season = resolveFootballSeason();

  for (const league of FEATURED_LEAGUE_IDS) {
    for (const resolvedSeason of candidateSeasons(league, season)) {
      const standingsKey = leagueCacheKey("standings", league, resolvedSeason);
      const existing = await persistentLeagueCache.get(standingsKey);
      if (existing) break;

      try {
        const standings = await footballProviderManager.execute(
          "getStandings",
          league,
          resolvedSeason
        );
        if (Array.isArray(standings) && standings.length > 0) {
          await persistentLeagueCache.set(standingsKey, standings);
          console.log(
            `[Football] Warmed standings cache for league ${league} (${resolvedSeason})`
          );
          break;
        }
      } catch {
        // Try the next season year.
      }

      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }
}
