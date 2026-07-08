export interface NormalizedLineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string | null;
  photo: string;
}

export interface NormalizedLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  startXI: Array<{ player: NormalizedLineupPlayer }>;
  substitutes: Array<{ player: NormalizedLineupPlayer }>;
  coach: { id?: number; name: string; photo: string };
}

interface RawLineupPlayer {
  id?: number;
  name?: string;
  number?: number;
  pos?: string;
  grid?: string | null;
}

interface RawLineupEntry {
  team?: { id?: number; name?: string; logo?: string };
  formation?: string | null;
  startXI?: Array<{ player?: RawLineupPlayer }>;
  substitutes?: Array<{ player?: RawLineupPlayer }>;
  coach?: { id?: number; name?: string; photo?: string };
}

function playerPhoto(id?: number): string {
  return id ? `https://media.api-sports.io/football/players/${id}.png` : "";
}

function coachPhoto(id?: number, existing?: string): string {
  if (existing?.trim()) return existing;
  return id ? `https://media.api-sports.io/football/coachs/${id}.png` : "";
}

function mapPlayer(raw?: RawLineupPlayer): NormalizedLineupPlayer {
  const id = raw?.id ?? 0;
  return {
    id,
    name: raw?.name ?? "Unknown",
    number: raw?.number ?? 0,
    pos: raw?.pos ?? "",
    grid: raw?.grid ?? null,
    photo: playerPhoto(id),
  };
}

export function normalizeLineups(raw: unknown[]): NormalizedLineup[] {
  return (raw as RawLineupEntry[])
    .filter((entry) => entry?.team?.id)
    .map((entry) => ({
      team: {
        id: entry.team!.id!,
        name: entry.team!.name ?? "Team",
        logo: entry.team!.logo ?? "",
      },
      formation: entry.formation?.trim() || "—",
      startXI: (entry.startXI ?? []).map((row) => ({
        player: mapPlayer(row.player),
      })),
      substitutes: (entry.substitutes ?? []).map((row) => ({
        player: mapPlayer(row.player),
      })),
      coach: {
        id: entry.coach?.id,
        name: entry.coach?.name ?? "",
        photo: coachPhoto(entry.coach?.id, entry.coach?.photo),
      },
    }));
}
