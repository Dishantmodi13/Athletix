import { env } from "../../config/env";
import { cache } from "../../services/cache.service";
import type { MatchDetailsResult, NormalizedMatch } from "./football.types";
import {
  normalizeTheSportsDbLineups,
  normalizeTheSportsDbStatistics,
  normalizeTheSportsDbTimeline,
} from "./theSportsDbNormalize";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

interface TsdbEvent {
  idEvent: string;
  idAPIfootball?: string | null;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  dateEvent?: string;
  strTimestamp?: string;
  strLeague?: string;
  strStatus?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
}

function apiKey(): string {
  return env.theSportsDbApiKey.trim() || "3";
}

async function tsdbGet<T>(endpoint: string, ttlSeconds = 3600): Promise<T> {
  const url = `${BASE_URL}/${apiKey()}/${endpoint}`;
  const cacheKey = `tsdb:${url}`;

  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    throw new Error(`TheSportsDB HTTP ${res.status}`);
  }

  const body = (await res.json()) as T;
  cache.set(cacheKey, body, ttlSeconds);
  return body;
}

const TEAM_SEARCH_ALIASES: Record<string, string[]> = {
  "united states": ["usa", "united states"],
  usa: ["usa", "united states"],
};

function searchNames(teamName: string): string[] {
  const key = teamName.toLowerCase().trim();
  const aliases = TEAM_SEARCH_ALIASES[key];
  if (aliases) return [...new Set([teamName, ...aliases])];
  return [teamName];
}

function searchSlug(home: string, away: string): string {
  return `${home}_vs_${away}`.replace(/\s+/g, "_");
}

function sameDay(a: string, b: string): boolean {
  return a.split("T")[0] === b.split("T")[0];
}

function pickEvent(events: TsdbEvent[], match: NormalizedMatch): TsdbEvent | null {
  if (!events.length) return null;

  const matchDay = match.date.split("T")[0]!;
  const byDate = events.filter((e) => e.dateEvent === matchDay);
  const pool = byDate.length > 0 ? byDate : events;

  const home = match.teams.home.name.toLowerCase();
  const away = match.teams.away.name.toLowerCase();

  const exact = pool.find((e) => {
    const h = (e.strHomeTeam ?? "").toLowerCase();
    const a = (e.strAwayTeam ?? "").toLowerCase();
    return (
      (h.includes(home) || home.includes(h)) && (a.includes(away) || away.includes(a))
    );
  });

  return exact ?? pool[0] ?? null;
}

async function findEvent(match: NormalizedMatch): Promise<TsdbEvent | null> {
  const mapKey = `tsdb-event:v1:${match.id}`;
  const mapped = cache.get<TsdbEvent>(mapKey);
  if (mapped) return mapped;

  const queries = [
    ...searchNames(match.teams.home.name).flatMap((home) =>
      searchNames(match.teams.away.name).flatMap((away) => [
        searchSlug(home, away),
        searchSlug(away, home),
      ])
    ),
  ];
  const uniqueQueries = [...new Set(queries)];

  for (const query of uniqueQueries) {
    try {
      const data = await tsdbGet<{ event: TsdbEvent[] | null }>(
        `searchevents.php?e=${encodeURIComponent(query)}`,
        86_400
      );
      const found = pickEvent(data.event ?? [], match);
      if (found) {
        cache.set(mapKey, found, 86_400 * 7);
        return found;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/** Resolve API-Football fixture id via TheSportsDB event search. */
export async function findApiFootballIdFromTheSportsDb(
  match: NormalizedMatch
): Promise<number | null> {
  const event = await findEvent(match);
  const id = event?.idAPIfootball;
  if (!id) return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export class TheSportsDbProvider {
  isAvailable(): boolean {
    return true;
  }

  async getMatchDetails(match: NormalizedMatch): Promise<MatchDetailsResult> {
    const empty: MatchDetailsResult = {
      match,
      statistics: [],
      events: [],
      lineups: [],
    };

    try {
      const event = await findEvent(match);
      if (!event?.idEvent) return empty;

      const eventId = event.idEvent;
      const [timeline, stats, lineup] = await Promise.all([
        tsdbGet<{ timeline: unknown[] | null }>(
          `lookuptimeline.php?id=${eventId}`,
          86_400
        ).catch(() => ({ timeline: [] })),
        tsdbGet<{ eventstats: unknown[] | null }>(
          `lookupeventstats.php?id=${eventId}`,
          86_400
        ).catch(() => ({ eventstats: [] })),
        tsdbGet<{ lineup: unknown[] | null }>(
          `lookuplineup.php?id=${eventId}`,
          86_400
        ).catch(() => ({ lineup: [] })),
      ]);

      const events = normalizeTheSportsDbTimeline(
        timeline.timeline ?? [],
        match,
        event
      );
      const statistics = normalizeTheSportsDbStatistics(
        stats.eventstats ?? [],
        match,
        event
      );
      const lineups = normalizeTheSportsDbLineups(lineup.lineup ?? [], match, event);

      return { match, events, statistics, lineups };
    } catch (error) {
      console.warn("[TheSportsDB] Match enrichment failed:", (error as Error).message);
      return empty;
    }
  }
}

export const theSportsDbProvider = new TheSportsDbProvider();
