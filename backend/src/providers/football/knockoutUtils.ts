import type { NormalizedMatch } from "./football.types";

export const KNOCKOUT_STAGES = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
  "THIRD_PLACE",
] as const;

export type KnockoutStage = (typeof KNOCKOUT_STAGES)[number];

export interface BracketTeam {
  id: number;
  name: string;
  code: string;
  logo: string;
  score: number | null;
  winner: boolean | null;
}

export interface BracketMatch {
  id: number;
  date: string;
  status: { short: string; long: string; elapsed: number | null };
  home: BracketTeam;
  away: BracketTeam;
}

export interface BracketSide {
  left: BracketMatch[];
  right: BracketMatch[];
}

export interface KnockoutBracketData {
  last32: BracketSide;
  last16: BracketSide;
  quarterFinals: BracketSide;
  semiFinals: BracketSide;
  final: BracketMatch | null;
  thirdPlace: BracketMatch | null;
  champion: { id: number; name: string; code: string; logo: string } | null;
}

function teamCode(name: string, shortName?: string): string {
  if (shortName?.trim()) {
    const s = shortName.trim().toUpperCase();
    if (s.length <= 3) return s;
  }
  if (!name?.trim() || name === "TBD") return "TBD";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function toBracketTeam(
  team: NormalizedMatch["teams"]["home"],
  score: number | null
): BracketTeam {
  const id = team.id ?? 0;
  const name = team.name?.trim() || "TBD";

  return {
    id,
    name,
    code: teamCode(name, team.shortName),
    logo: team.logo ?? "",
    score,
    winner: team.winner,
  };
}

export function toBracketMatch(match: NormalizedMatch): BracketMatch {
  return {
    id: match.id,
    date: match.date,
    status: match.status,
    home: toBracketTeam(match.teams.home, match.goals.home),
    away: toBracketTeam(match.teams.away, match.goals.away),
  };
}

/** Prefer football-data bracket matchday; fall back to stable match id order. */
function byBracketOrder(a: NormalizedMatch, b: NormalizedMatch): number {
  const dayA = a.matchday ?? 0;
  const dayB = b.matchday ?? 0;
  if (dayA > 0 && dayB > 0 && dayA !== dayB) return dayA - dayB;
  return a.id - b.id;
}

function sortStage(matches: NormalizedMatch[]): NormalizedMatch[] {
  return [...matches].sort(byBracketOrder);
}

function winnerTeamId(match: NormalizedMatch): number | null {
  if (match.teams.home.winner) return match.teams.home.id ?? null;
  if (match.teams.away.winner) return match.teams.away.id ?? null;
  return null;
}

function participantIds(match: NormalizedMatch): number[] {
  return [match.teams.home.id, match.teams.away.id].filter(
    (id): id is number => typeof id === "number" && id > 0
  );
}

function teamPool(matches: NormalizedMatch[]): Set<number> {
  const ids = new Set<number>();
  for (const match of matches) {
    participantIds(match).forEach((id) => ids.add(id));
    const winner = winnerTeamId(match);
    if (winner) ids.add(winner);
  }
  return ids;
}

function matchSide(
  match: NormalizedMatch,
  leftPool: Set<number>,
  rightPool: Set<number>
): "left" | "right" | null {
  const ids = participantIds(match);
  if (ids.length === 0) return null;

  let leftHits = 0;
  let rightHits = 0;
  for (const id of ids) {
    if (leftPool.has(id)) leftHits++;
    if (rightPool.has(id)) rightHits++;
  }

  if (leftHits > 0 && rightHits === 0) return "left";
  if (rightHits > 0 && leftHits === 0) return "right";
  if (leftHits > rightHits) return "left";
  if (rightHits > leftHits) return "right";
  return null;
}

function splitByLineage(
  matches: NormalizedMatch[],
  leftPool: Set<number>,
  rightPool: Set<number>,
  perSide: number
): { left: NormalizedMatch[]; right: NormalizedMatch[] } {
  const left: NormalizedMatch[] = [];
  const right: NormalizedMatch[] = [];
  const unknown: NormalizedMatch[] = [];

  for (const match of sortStage(matches)) {
    const side = matchSide(match, leftPool, rightPool);
    if (side === "left") left.push(match);
    else if (side === "right") right.push(match);
    else unknown.push(match);
  }

  for (const match of unknown) {
    if (left.length < perSide) left.push(match);
    else right.push(match);
  }

  return { left, right };
}

function findFeeders(pool: NormalizedMatch[], next: NormalizedMatch): NormalizedMatch[] {
  const nextIds = new Set(participantIds(next));
  if (nextIds.size === 0) return [];

  return pool.filter((match) => {
    const winner = winnerTeamId(match);
    if (winner && nextIds.has(winner)) return true;
    return participantIds(match).some((id) => nextIds.has(id));
  });
}

/** Order matches so each consecutive pair feeds the next-round slot. */
function orderFromNextRound(
  current: NormalizedMatch[],
  nextRound: NormalizedMatch[]
): NormalizedMatch[] {
  const sortedNext = sortStage(nextRound);
  const pool = sortStage(current);
  const used = new Set<number>();
  const ordered: NormalizedMatch[] = [];

  for (const next of sortedNext) {
    let feeders = findFeeders(
      pool.filter((m) => !used.has(m.id)),
      next
    ).sort(byBracketOrder);

    if (feeders.length < 2) {
      const remaining = pool.filter((m) => !used.has(m.id)).sort(byBracketOrder);
      feeders = [...feeders, ...remaining.filter((m) => !feeders.includes(m))].slice(0, 2);
    }

    for (const feeder of feeders.slice(0, 2)) {
      if (!used.has(feeder.id)) {
        ordered.push(feeder);
        used.add(feeder.id);
      }
    }
  }

  for (const match of pool) {
    if (!used.has(match.id)) ordered.push(match);
  }

  return ordered;
}

function buildHalf(
  r32Pool: NormalizedMatch[],
  r16Pool: NormalizedMatch[],
  qfPool: NormalizedMatch[],
  sfPool: NormalizedMatch[],
  side: "left" | "right"
): {
  last32: BracketMatch[];
  last16: BracketMatch[];
  quarterFinals: BracketMatch[];
  semiFinals: BracketMatch[];
} {
  const sf = sortStage(sfPool);
  const qfOrdered = orderFromNextRound(sortStage(qfPool), sf);
  const r16Ordered = orderFromNextRound(sortStage(r16Pool), qfOrdered);
  const r32Ordered = orderFromNextRound(sortStage(r32Pool), r16Ordered);

  return {
    last32: r32Ordered.map(toBracketMatch),
    last16: r16Ordered.map(toBracketMatch),
    quarterFinals: qfOrdered.map(toBracketMatch),
    semiFinals: sf.map(toBracketMatch),
  };
}

function pickChampion(final: BracketMatch | null) {
  if (!final) return null;
  if (final.status.short !== "FT" && final.status.short !== "AET" && final.status.short !== "PEN") {
    return null;
  }
  if (final.home.winner) {
    return {
      id: final.home.id,
      name: final.home.name,
      code: final.home.code,
      logo: final.home.logo,
    };
  }
  if (final.away.winner) {
    return {
      id: final.away.id,
      name: final.away.name,
      code: final.away.code,
      logo: final.away.logo,
    };
  }
  return null;
}

export function buildKnockoutBracket(matches: NormalizedMatch[]): KnockoutBracketData {
  const byStage = new Map<KnockoutStage, NormalizedMatch[]>();

  for (const stage of KNOCKOUT_STAGES) {
    byStage.set(stage, []);
  }

  for (const match of matches) {
    const stage = match.stage as KnockoutStage | undefined;
    if (!stage || !byStage.has(stage)) continue;
    byStage.get(stage)!.push(match);
  }

  const r32All = sortStage(byStage.get("LAST_32") ?? []);
  const r16All = sortStage(byStage.get("LAST_16") ?? []);
  const qfAll = sortStage(byStage.get("QUARTER_FINALS") ?? []);
  const sfAll = sortStage(byStage.get("SEMI_FINALS") ?? []);

  // Round of 32: football-data match ids follow bracket path order (1–8 left, 9–16 right).
  const r32LeftPool = r32All.slice(0, 8);
  const r32RightPool = r32All.slice(8, 16);

  const leftR32Teams = teamPool(r32LeftPool);
  const rightR32Teams = teamPool(r32RightPool);

  const { left: r16LeftPool, right: r16RightPool } = splitByLineage(
    r16All,
    leftR32Teams,
    rightR32Teams,
    4
  );

  const { left: qfLeftPool, right: qfRightPool } = splitByLineage(
    qfAll,
    teamPool(r16LeftPool),
    teamPool(r16RightPool),
    2
  );

  const { left: sfLeftPool, right: sfRightPool } = splitByLineage(
    sfAll,
    teamPool(qfLeftPool),
    teamPool(qfRightPool),
    1
  );

  const left = buildHalf(r32LeftPool, r16LeftPool, qfLeftPool, sfLeftPool, "left");
  const right = buildHalf(r32RightPool, r16RightPool, qfRightPool, sfRightPool, "right");

  const final = byStage.get("FINAL")?.[0] ?? null;
  const thirdPlace = byStage.get("THIRD_PLACE")?.[0] ?? null;

  return {
    last32: { left: left.last32, right: right.last32 },
    last16: { left: left.last16, right: right.last16 },
    quarterFinals: { left: left.quarterFinals, right: right.quarterFinals },
    semiFinals: { left: left.semiFinals, right: right.semiFinals },
    final: final ? toBracketMatch(final) : null,
    thirdPlace: thirdPlace ? toBracketMatch(thirdPlace) : null,
    champion: pickChampion(final ? toBracketMatch(final) : null),
  };
}

export function isKnockoutStage(stage: string | null | undefined): stage is KnockoutStage {
  return !!stage && (KNOCKOUT_STAGES as readonly string[]).includes(stage);
}
