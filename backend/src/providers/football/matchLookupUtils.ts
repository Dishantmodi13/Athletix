import type { NormalizedMatch, FootballProvider } from "./football.types";

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

export async function findApiFootballFixtureId(
  match: NormalizedMatch,
  provider: Pick<FootballProvider, "getFixturesByDate">
): Promise<number | null> {
  const date = match.date.split("T")[0];

  try {
    const fixtures = await provider.getFixturesByDate(date);
    const found = fixtures.find((f) => teamsMatch(f, match));
    return found?.id ?? null;
  } catch {
    return null;
  }
}
