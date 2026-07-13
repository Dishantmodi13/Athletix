import { cache } from "../../services/cache.service";
import type { NormalizedMatch, FootballProvider } from "./football.types";
import { apiFootballProvider } from "./apiFootball.provider";
import { isRateLimitError } from "./apiKeyPool";
import { WORLD_CUP_LEAGUE_ID } from "./leagueMap";
import { findApiFootballIdFromTheSportsDb } from "./theSportsDb.provider";

const TEAM_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  uae: "united arab emirates",
  korea: "south korea",
  "korea republic": "south korea",
  "republic of ireland": "ireland",
  "cote divoire": "ivory coast",
  "côte d'ivoire": "ivory coast",
};

function normalizeTeamName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|fk|sv)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return TEAM_ALIASES[base] ?? base;
}

function teamNamesFor(match: NormalizedMatch, side: "home" | "away"): string[] {
  const team = match.teams[side];
  const names = [team.name, team.shortName].filter(Boolean) as string[];
  return [...new Set(names.map(normalizeTeamName))];
}

function namesCompatible(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

function teamsMatch(fixture: NormalizedMatch, target: NormalizedMatch): boolean {
  const fHome = teamNamesFor(fixture, "home");
  const fAway = teamNamesFor(fixture, "away");
  const tHome = teamNamesFor(target, "home");
  const tAway = teamNamesFor(target, "away");

  const direct =
    fHome.some((fh) => tHome.some((th) => namesCompatible(fh, th))) &&
    fAway.some((fa) => tAway.some((ta) => namesCompatible(fa, ta)));

  const swapped =
    fHome.some((fh) => tAway.some((ta) => namesCompatible(fh, ta))) &&
    fAway.some((fa) => tHome.some((th) => namesCompatible(fa, th)));

  return direct || swapped;
}

function datesCompatible(fixture: NormalizedMatch, target: NormalizedMatch): boolean {
  const targetDates = datesAround(target.date);
  const fixtureDay = fixture.date.split("T")[0]!;
  return targetDates.includes(fixtureDay);
}

function fixturesMatch(fixture: NormalizedMatch, target: NormalizedMatch): boolean {
  return teamsMatch(fixture, target) && datesCompatible(fixture, target);
}

function datesAround(isoDate: string): string[] {
  const base = new Date(isoDate);
  const dates: string[] = [];
  for (const offset of [-1, 0, 1]) {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().split("T")[0]!);
  }
  return [...new Set(dates)];
}

function seasonFromDate(isoDate: string): number {
  return new Date(isoDate).getFullYear();
}

export function cacheFdToAfMapping(fdId: number, afId: number): void {
  cache.set(`fd-to-af-fixture:v3:${fdId}`, afId, 86_400 * 14);
}

export function getCachedFdToAfMapping(fdId: number): number | null {
  return cache.get<number>(`fd-to-af-fixture:v3:${fdId}`) ?? null;
}

function cacheMapping(fdId: number, afId: number): void {
  cacheFdToAfMapping(fdId, afId);
}

function getCachedMapping(fdId: number): number | null {
  return getCachedFdToAfMapping(fdId);
}

export function resolveAlternateFixtureIds(id: number): number[] {
  const ids = new Set<number>([id]);
  const mapped = getCachedFdToAfMapping(id);
  if (mapped && mapped !== id) ids.add(mapped);
  return [...ids];
}

async function getLeagueFixtureCatalog(
  leagueId: number,
  season: number
): Promise<NormalizedMatch[]> {
  const cacheKey = `af-league-catalog:v1:${leagueId}:${season}`;
  const cached = cache.get<NormalizedMatch[]>(cacheKey);
  if (cached) return cached;

  try {
    const fixtures = await apiFootballProvider.getAllLeagueFixtures(leagueId, season);
    if (fixtures.length > 0) {
      cache.set(cacheKey, fixtures, 86_400);
    }
    return fixtures;
  } catch (error) {
    if (isRateLimitError(error)) {
      const stale = cache.getStale<NormalizedMatch[]>(cacheKey);
      if (stale) return stale;
    }
    return [];
  }
}

async function findFromLeagueCatalog(match: NormalizedMatch): Promise<number | null> {
  const leagueId = match.league.id;
  if (!leagueId) return null;

  const year = seasonFromDate(match.date);
  const seasons = leagueId === WORLD_CUP_LEAGUE_ID ? [year, year - 1, 2022] : [year, year - 1];

  for (const season of [...new Set(seasons)]) {
    const catalog = await getLeagueFixtureCatalog(leagueId, season);
    const found = catalog.find((fixture) => fixturesMatch(fixture, match));
    if (found?.id) return found.id;
  }

  return null;
}

async function findFromLeagueDateWindow(match: NormalizedMatch): Promise<number | null> {
  const leagueId = match.league.id;
  if (!leagueId) return null;

  const dates = datesAround(match.date);
  const from = dates[0]!;
  const to = dates[dates.length - 1]!;
  const year = seasonFromDate(match.date);

  try {
    const fixtures = await apiFootballProvider.getFixturesInRange(leagueId, year, from, to);
    const found = fixtures.find((fixture) => fixturesMatch(fixture, match));
    return found?.id ?? null;
  } catch {
    return null;
  }
}

async function findByTeamSearch(match: NormalizedMatch): Promise<number | null> {
  if (!apiFootballProvider.isAvailable()) return null;

  try {
    const homeName = match.teams.home.name;
    const awayName = match.teams.away.name;

    const homeTeams = await apiFootballProvider.searchTeams(homeName);
    const awayTeams = await apiFootballProvider.searchTeams(awayName);

    const homeNorm = normalizeTeamName(homeName);
    const awayNorm = normalizeTeamName(awayName);

    const home =
      homeTeams.find((t) => {
        const n = normalizeTeamName(t.name);
        return namesCompatible(n, homeNorm);
      }) ?? homeTeams[0];

    const away =
      awayTeams.find((t) => {
        const n = normalizeTeamName(t.name);
        return namesCompatible(n, awayNorm);
      }) ?? awayTeams[0];

    if (!home?.id || !away?.id) return null;

    return apiFootballProvider.findHeadToHeadFixtureId(home.id, away.id, match.date);
  } catch {
    return null;
  }
}

export async function findApiFootballFixtureId(
  match: NormalizedMatch,
  provider: Pick<FootballProvider, "getFixturesByDate">
): Promise<number | null> {
  const cached = getCachedMapping(match.id);
  if (cached) return cached;

  const strategies: Array<() => Promise<number | null>> = [
    async () => findApiFootballIdFromTheSportsDb(match),
    () => findFromLeagueDateWindow(match),
    async () => {
      const date = match.date.split("T")[0]!;
      try {
        for (const d of datesAround(date)) {
          const fixtures = await provider.getFixturesByDate(d);
          const found = fixtures.find((f) => fixturesMatch(f, match));
          if (found?.id) return found.id;
        }
      } catch (error) {
        if (!isRateLimitError(error)) return null;
      }
      return null;
    },
    () => findFromLeagueCatalog(match),
    () => findByTeamSearch(match),
  ];

  for (const strategy of strategies) {
    const afId = await strategy();
    if (afId && afId !== match.id) {
      cacheMapping(match.id, afId);
      return afId;
    }
  }

  return null;
}

/** Build fd→af mappings in one batch when football-data fixtures are loaded. */
export async function prewarmFixtureMappings(matches: NormalizedMatch[]): Promise<void> {
  const fdMatches = matches.filter((m) => m.source === "football-data" && m.league.id > 0);
  if (fdMatches.length === 0) return;

  for (const fd of fdMatches.filter((m) => !getCachedMapping(m.id))) {
    try {
      const afId = await findApiFootballIdFromTheSportsDb(fd);
      if (afId && afId !== fd.id) cacheMapping(fd.id, afId);
    } catch {
      // best-effort bridge
    }
  }

  const leagues = [...new Set(fdMatches.map((m) => m.league.id))];
  for (const leagueId of leagues) {
    const seasons = [
      ...new Set(
        fdMatches
          .filter((m) => m.league.id === leagueId)
          .flatMap((m) => {
            const y = seasonFromDate(m.date);
            return leagueId === WORLD_CUP_LEAGUE_ID ? [y, y - 1, 2022] : [y, y - 1];
          })
      ),
    ];

    for (const season of seasons) {
      const catalog = await getLeagueFixtureCatalog(leagueId, season);
      if (catalog.length === 0) continue;

      for (const fd of fdMatches.filter((m) => m.league.id === leagueId)) {
        if (getCachedMapping(fd.id)) continue;
        const found = catalog.find((af) => fixturesMatch(af, fd));
        if (found?.id) cacheMapping(fd.id, found.id);
      }
    }
  }
}

export function getDetailFixtureId(match: NormalizedMatch): number {
  if (match.source !== "football-data") return match.id;
  return getCachedMapping(match.id) ?? match.id;
}

export function attachDetailFixtureIds<T extends NormalizedMatch>(matches: T[]): T[] {
  return matches.map((match) => ({
    ...match,
    detailFixtureId: getDetailFixtureId(match),
  }));
}
