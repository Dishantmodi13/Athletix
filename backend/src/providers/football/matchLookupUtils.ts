import { cache } from "../../services/cache.service";
import type { NormalizedMatch, FootballProvider } from "./football.types";
import { apiFootballProvider } from "./apiFootball.provider";
import { isRateLimitError } from "./apiKeyPool";

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|fk|sv)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(fixture: NormalizedMatch, target: NormalizedMatch): boolean {
  const fHome = normalizeTeamName(fixture.teams.home.name);
  const fAway = normalizeTeamName(fixture.teams.away.name);
  const tHome = normalizeTeamName(target.teams.home.name);
  const tAway = normalizeTeamName(target.teams.away.name);

  return (
    (fHome === tHome && fAway === tAway) ||
    (fHome === tAway && fAway === tHome) ||
    (fHome.includes(tHome) && fAway.includes(tAway)) ||
    (fHome.includes(tAway) && fAway.includes(tHome))
  );
}

function datesAround(isoDate: string): string[] {
  const base = new Date(`${isoDate}T12:00:00`);
  const dates: string[] = [];
  for (const offset of [-1, 0, 1]) {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().split("T")[0]!);
  }
  return [...new Set(dates)];
}

async function findByTeamSearch(match: NormalizedMatch): Promise<number | null> {
  if (!apiFootballProvider.isAvailable()) return null;

  try {
    const homeName = normalizeTeamName(match.teams.home.name);
    const awayName = normalizeTeamName(match.teams.away.name);

    const homeTeams = await apiFootballProvider.searchTeams(match.teams.home.name);
    const awayTeams = await apiFootballProvider.searchTeams(match.teams.away.name);

    const home =
      homeTeams.find((t) => {
        const n = normalizeTeamName(t.name);
        return n.includes(homeName) || homeName.includes(n);
      }) ?? homeTeams[0];

    const away =
      awayTeams.find((t) => {
        const n = normalizeTeamName(t.name);
        return n.includes(awayName) || awayName.includes(n);
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
  const mapKey = `fd-to-af-fixture:v1:${match.id}`;
  const mapped = cache.get<number>(mapKey);
  if (mapped) return mapped;

  const date = match.date.split("T")[0]!;

  try {
    for (const d of datesAround(date)) {
      const fixtures = await provider.getFixturesByDate(d);
      const found = fixtures.find((f) => teamsMatch(f, match));
      if (found?.id) {
        cache.set(mapKey, found.id, 86_400 * 7);
        return found.id;
      }
    }
  } catch (error) {
    if (!isRateLimitError(error)) {
      return null;
    }
  }

  const byTeams = await findByTeamSearch(match);
  if (byTeams) {
    cache.set(mapKey, byTeams, 86_400 * 7);
  }
  return byTeams;
}
