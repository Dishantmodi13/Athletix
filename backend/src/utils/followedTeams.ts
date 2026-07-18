export interface FollowedTeamInput {
  id: number;
  name: string;
}

export function normalizeTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function parseFollowedTeamsQuery(raw: string | undefined): FollowedTeamInput[] {
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((entry) => {
      const [idPart, ...nameParts] = entry.split(":");
      const id = Number(idPart);
      const name = decodeURIComponent(nameParts.join(":") || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { id, name };
    })
    .filter((team): team is FollowedTeamInput => team !== null);
}

export function matchIncludesFollowedTeam(
  match: { teams: { home: { id: number; name: string }; away: { id: number; name: string } } },
  followed: FollowedTeamInput[]
): boolean {
  if (followed.length === 0) return false;

  const ids = new Set(followed.map((team) => team.id));
  const names = new Set(
    followed.map((team) => normalizeTeamName(team.name)).filter(Boolean)
  );
  const homeName = normalizeTeamName(match.teams.home.name);
  const awayName = normalizeTeamName(match.teams.away.name);

  return (
    ids.has(match.teams.home.id) ||
    ids.has(match.teams.away.id) ||
    names.has(homeName) ||
    names.has(awayName)
  );
}
