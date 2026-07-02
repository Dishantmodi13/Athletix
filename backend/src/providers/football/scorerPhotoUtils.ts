import type { TopScorer } from "./football.types";

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamName(name: string): string {
  return normalizeKey(name)
    .replace(/\b(fc|cf|sc|afc|fk|sv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastName(name: string): string {
  const parts = normalizeKey(name).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function playerKey(name: string, teamName?: string): string {
  const player = normalizeKey(name);
  if (!teamName) return `name|${player}`;
  return `name|${player}|${normalizeTeamName(teamName)}`;
}

function buildPhotoIndex(sources: TopScorer[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const row of sources) {
    const photo = row.player.photo?.trim();
    if (!photo) continue;

    const teamName = row.statistics[0]?.team.name;
    const ln = lastName(row.player.name);

    index.set(playerKey(row.player.name), photo);
    if (teamName) {
      index.set(playerKey(row.player.name, teamName), photo);
      if (ln) {
        index.set(`last|${normalizeTeamName(teamName)}|${ln}`, photo);
      }
    }
    if (ln) {
      index.set(`last|${ln}`, photo);
    }
  }

  return index;
}

function lookupPhoto(
  name: string,
  teamName: string | undefined,
  index: Map<string, string>
): string {
  const ln = lastName(name);
  const keys = [
    teamName ? playerKey(name, teamName) : "",
    playerKey(name),
    teamName && ln ? `last|${normalizeTeamName(teamName)}|${ln}` : "",
    ln ? `last|${ln}` : "",
  ].filter(Boolean);

  for (const key of keys) {
    const photo = index.get(key);
    if (photo) return photo;
  }

  return "";
}

export function mergeScorerPhotos(target: TopScorer[], sources: TopScorer[]): TopScorer[] {
  if (!target.length || !sources.length) return target;

  const photos = buildPhotoIndex(sources);

  return target.map((row) => {
    if (row.player.photo?.trim()) return row;

    const teamName = row.statistics[0]?.team.name;
    const photo = lookupPhoto(row.player.name, teamName, photos);

    if (!photo) return row;

    return {
      ...row,
      player: { ...row.player, photo },
    };
  });
}
