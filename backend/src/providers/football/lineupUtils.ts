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

function positionRole(pos: string): number {
  const p = pos.trim().toUpperCase();
  if (p === "G" || p.startsWith("G")) return 1;
  if (p === "D" || p.startsWith("D")) return 2;
  if (p === "M" || p.startsWith("M")) return 3;
  if (p === "F" || p.startsWith("F")) return 4;
  return 3;
}

function parseFormation(formation: string): number[] | null {
  const trimmed = formation.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;
  const parts = trimmed
    .split("-")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n > 0);
  if (parts.length < 2) return null;
  const total = parts.reduce((a, b) => a + b, 0);
  if (total < 4 || total > 10) return null;
  return parts;
}

/** Guess outfield shape when the provider omits formation (e.g. World Cup). */
function inferFormationChunks(outfield: NormalizedLineupPlayer[]): number[] {
  let d = 0;
  let m = 0;
  let f = 0;
  for (const p of outfield) {
    const role = positionRole(p.pos);
    if (role === 2) d++;
    else if (role === 3) m++;
    else if (role === 4) f++;
  }

  if (d === 4 && m === 3 && f === 3) return [4, 3, 3];
  if (d === 4 && m === 5 && f === 1) return [4, 2, 3, 1];
  if (d === 4 && m === 4 && f === 2) return [4, 4, 2];
  if (d === 4 && m === 2 && f === 4) return [4, 2, 4];
  if (d === 3 && m === 5 && f === 2) return [3, 5, 2];
  if (d === 5 && m === 3 && f === 2) return [5, 3, 2];
  if (d === 4 && m >= 3 && f >= 1) {
    const pivot = Math.min(2, m - f);
    return [4, pivot, m - pivot, f];
  }
  return [d, m, f].filter((n) => n > 0);
}

/** Attacking rows: shirt numbers usually rise toward the right flank. */
function orderLineLeftToRight(players: NormalizedLineupPlayer[]): NormalizedLineupPlayer[] {
  if (players.length <= 1) return players;
  return [...players].sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Providers often list the back line right-to-left (RB first). Reverse so
 * grid col 1 = team's left touchline, matching API-Football grid convention.
 */
function orderFormationLine(
  players: NormalizedLineupPlayer[],
  outfieldLineIndex: number
): NormalizedLineupPlayer[] {
  if (players.length <= 1) return players;
  if (outfieldLineIndex === 0) return [...players].reverse();
  return orderLineLeftToRight(players);
}

function buildFormationLines(
  starters: NormalizedLineupPlayer[],
  formation: string
): NormalizedLineupPlayer[][] {
  const gks = starters.filter((p) => positionRole(p.pos) === 1);
  const outfield = starters.filter((p) => positionRole(p.pos) !== 1);
  const chunks = parseFormation(formation) ?? inferFormationChunks(outfield);

  const lines: NormalizedLineupPlayer[][] = [];
  if (gks.length) lines.push(gks);

  let idx = 0;
  let outfieldLine = 0;
  for (const count of chunks) {
    const slice = outfield.slice(idx, idx + count);
    if (slice.length) {
      lines.push(orderFormationLine(slice, outfieldLine));
      outfieldLine++;
    }
    idx += count;
  }

  if (idx < outfield.length) {
    const tail = orderFormationLine(outfield.slice(idx), outfieldLine);
    if (lines.length) lines[lines.length - 1]!.push(...tail);
    else lines.push(tail);
  }

  return lines;
}

/** Assign API-Football-style grid (row:col) when the provider omits coordinates. */
export function synthesizeLineupGrids(lineup: NormalizedLineup): NormalizedLineup {
  const starters = lineup.startXI.map((row) => row.player);
  if (starters.length === 0) return lineup;
  if (starters.some((p) => p.grid)) return lineup;

  const lines = buildFormationLines(starters, lineup.formation);
  let row = 1;
  for (const line of lines) {
    line.forEach((player, colIdx) => {
      player.grid = `${row}:${colIdx + 1}`;
    });
    row++;
  }

  const outfield = starters.filter((p) => positionRole(p.pos) !== 1);
  const inferred =
    parseFormation(lineup.formation) ?? inferFormationChunks(outfield);
  const formationLabel =
    lineup.formation && lineup.formation !== "—"
      ? lineup.formation
      : inferred.join("-");

  return { ...lineup, formation: formationLabel };
}

export function normalizeLineups(raw: unknown[]): NormalizedLineup[] {
  return (raw as RawLineupEntry[])
    .filter((entry) => entry?.team?.id)
    .map((entry) => {
      const lineup: NormalizedLineup = {
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
      };
      return synthesizeLineupGrids(lineup);
    });
}
