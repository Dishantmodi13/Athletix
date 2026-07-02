import type { NormalizedMatch } from "./football.types";

export interface NormalizedMatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo?: string };
  player: { id?: number; name: string };
  assist: { name: string | null };
  type: string;
  detail: string;
  score?: { home: number | null; away: number | null };
}

interface ApiFootballEvent {
  time?: { elapsed?: number; extra?: number | null };
  team?: { id?: number; name?: string };
  player?: { id?: number; name?: string };
  assist?: { id?: number; name?: string } | null;
  type?: string;
  detail?: string;
}

interface FootballDataGoal {
  minute?: number;
  injuryTime?: number | null;
  type?: string;
  team?: { id?: number; name?: string };
  scorer?: { id?: number; name?: string };
  assist?: { id?: number; name?: string } | null;
  score?: { home?: number | null; away?: number | null };
}

interface FootballDataBooking {
  minute?: number;
  injuryTime?: number | null;
  team?: { id?: number; name?: string };
  player?: { id?: number; name?: string };
  card?: string;
}

interface FootballDataSub {
  minute?: number;
  injuryTime?: number | null;
  team?: { id?: number; name?: string };
  playerOut?: { id?: number; name?: string };
  playerIn?: { id?: number; name?: string };
}

export interface FootballDataMatchExtras {
  goals?: FootballDataGoal[];
  bookings?: FootballDataBooking[];
  substitutions?: FootballDataSub[];
  score?: {
    halfTime?: { home?: number | null; away?: number | null };
    regularTime?: { home?: number | null; away?: number | null };
    extraTime?: { home?: number | null; away?: number | null };
    penalties?: { home?: number | null; away?: number | null };
    duration?: string | null;
  };
}

function goalDetail(type?: string): string {
  switch (type?.toUpperCase()) {
    case "PENALTY":
      return "Penalty";
    case "OWN":
      return "Own Goal";
    default:
      return "Goal";
  }
}

export function eventsFromApiFootball(raw: unknown[]): NormalizedMatchEvent[] {
  return (raw as ApiFootballEvent[])
    .filter((e) => e?.type)
    .map((e) => ({
      time: {
        elapsed: e.time?.elapsed ?? 0,
        extra: e.time?.extra ?? null,
      },
      team: {
        id: e.team?.id ?? 0,
        name: e.team?.name ?? "",
      },
      player: {
        id: e.player?.id,
        name: e.player?.name ?? "",
      },
      assist: { name: e.assist?.name ?? null },
      type: e.type ?? "Event",
      detail: e.detail ?? e.type ?? "Event",
    }));
}

export function eventsFromFootballData(
  extras: FootballDataMatchExtras,
  match: NormalizedMatch
): NormalizedMatchEvent[] {
  const events: NormalizedMatchEvent[] = [];

  for (const goal of extras.goals ?? []) {
    const teamId = goal.team?.id ?? 0;
    const isHome = teamId > 0 ? teamId === match.teams.home.id : goal.team?.name === match.teams.home.name;

    events.push({
      time: {
        elapsed: goal.minute ?? 0,
        extra: goal.injuryTime ?? null,
      },
      team: {
        id: isHome ? match.teams.home.id : match.teams.away.id,
        name: goal.team?.name ?? (isHome ? match.teams.home.name : match.teams.away.name),
        logo: isHome ? match.teams.home.logo : match.teams.away.logo,
      },
      player: {
        id: goal.scorer?.id,
        name: goal.scorer?.name ?? "Unknown",
      },
      assist: { name: goal.assist?.name ?? null },
      type: "Goal",
      detail: goalDetail(goal.type),
      score: goal.score
        ? { home: goal.score.home ?? null, away: goal.score.away ?? null }
        : undefined,
    });
  }

  for (const booking of extras.bookings ?? []) {
    const teamId = booking.team?.id ?? 0;
    const isHome = teamId > 0 ? teamId === match.teams.home.id : booking.team?.name === match.teams.home.name;

    events.push({
      time: {
        elapsed: booking.minute ?? 0,
        extra: booking.injuryTime ?? null,
      },
      team: {
        id: isHome ? match.teams.home.id : match.teams.away.id,
        name: booking.team?.name ?? (isHome ? match.teams.home.name : match.teams.away.name),
      },
      player: {
        id: booking.player?.id,
        name: booking.player?.name ?? "Unknown",
      },
      assist: { name: null },
      type: "Card",
      detail: booking.card === "RED" ? "Red Card" : "Yellow Card",
    });
  }

  for (const sub of extras.substitutions ?? []) {
    const teamId = sub.team?.id ?? 0;
    const isHome = teamId > 0 ? teamId === match.teams.home.id : sub.team?.name === match.teams.home.name;

    events.push({
      time: {
        elapsed: sub.minute ?? 0,
        extra: sub.injuryTime ?? null,
      },
      team: {
        id: isHome ? match.teams.home.id : match.teams.away.id,
        name: sub.team?.name ?? (isHome ? match.teams.home.name : match.teams.away.name),
      },
      player: {
        name: sub.playerIn?.name ?? "Unknown",
      },
      assist: { name: sub.playerOut?.name ?? null },
      type: "subst",
      detail: "Substitution",
    });
  }

  return events.sort((a, b) => {
    const ta = a.time.elapsed + (a.time.extra ?? 0) * 0.01;
    const tb = b.time.elapsed + (b.time.extra ?? 0) * 0.01;
    return ta - tb;
  });
}

export function scoreSummaryFromFootballData(
  extras: FootballDataMatchExtras
): Array<{ label: string; home: number | null; away: number | null }> {
  const s = extras.score;
  if (!s) return [];

  const rows: Array<{ label: string; home: number | null; away: number | null }> = [];
  if (s.halfTime) rows.push({ label: "Half-time", home: s.halfTime.home ?? null, away: s.halfTime.away ?? null });
  if (s.regularTime) rows.push({ label: "90 min", home: s.regularTime.home ?? null, away: s.regularTime.away ?? null });
  if (s.extraTime && ((s.extraTime.home ?? 0) > 0 || (s.extraTime.away ?? 0) > 0)) {
    rows.push({ label: "Extra time", home: s.extraTime.home ?? null, away: s.extraTime.away ?? null });
  }
  if (s.penalties) rows.push({ label: "Penalties", home: s.penalties.home ?? null, away: s.penalties.away ?? null });
  return rows;
}
