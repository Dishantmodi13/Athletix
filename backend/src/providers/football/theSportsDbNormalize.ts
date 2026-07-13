import type { NormalizedMatch, NormalizedMatchEvent } from "./football.types";
import type { NormalizedLineup } from "./lineupUtils";

interface TsdbTimelineRow {
  strTimeline?: string;
  strTimelineDetail?: string;
  intTime?: string | number | null;
  strPlayer?: string | null;
  strAssist?: string | null;
  strHome?: string | null;
  strTeam?: string | null;
  strCutout?: string | null;
}

interface TsdbStatRow {
  strStat?: string;
  intHome?: string | number | null;
  intAway?: string | number | null;
}

interface TsdbLineupRow {
  strHome?: string | null;
  strSubstitute?: string | null;
  strPosition?: string | null;
  strPlayer?: string | null;
  intSquadNumber?: string | number | null;
  idPlayer?: string | number | null;
  strCutout?: string | null;
}

interface TsdbEventMeta {
  strHomeTeam?: string;
  strAwayTeam?: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
}

function elapsed(raw: string | number | null | undefined): number {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isHomeSide(row: TsdbTimelineRow, match: NormalizedMatch): boolean {
  if (row.strHome === "Yes") return true;
  if (row.strHome === "No") return false;
  const team = (row.strTeam ?? "").toLowerCase();
  return team.includes(match.teams.home.name.toLowerCase());
}

function mapTimelineType(raw?: string): string {
  switch ((raw ?? "").toLowerCase()) {
    case "goal":
      return "Goal";
    case "card":
      return "Card";
    case "subst":
      return "subst";
    default:
      return raw ?? "Event";
  }
}

export function normalizeTheSportsDbTimeline(
  rows: unknown[],
  match: NormalizedMatch,
  _event: TsdbEventMeta
): NormalizedMatchEvent[] {
  return (rows as TsdbTimelineRow[])
    .filter((row) => row.strPlayer || row.strTimeline)
    .map((row) => {
      const home = isHomeSide(row, match);
      const team = home ? match.teams.home : match.teams.away;

      return {
        time: { elapsed: elapsed(row.intTime), extra: null },
        team: { id: team.id, name: team.name, logo: team.logo },
        player: { name: row.strPlayer?.trim() || "Unknown" },
        assist: { name: row.strAssist?.trim() || null },
        type: mapTimelineType(row.strTimeline),
        detail: row.strTimelineDetail?.trim() || row.strTimeline || "Event",
      };
    })
    .sort((a, b) => a.time.elapsed - b.time.elapsed);
}

export function normalizeTheSportsDbStatistics(
  rows: unknown[],
  match: NormalizedMatch,
  event: TsdbEventMeta
): Array<{
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: number | string | null }>;
}> {
  if (!(rows as TsdbStatRow[]).length) return [];

  const homeStats = (rows as TsdbStatRow[]).map((row) => ({
    type: row.strStat ?? "Stat",
    value: row.intHome ?? null,
  }));

  const awayStats = (rows as TsdbStatRow[]).map((row) => ({
    type: row.strStat ?? "Stat",
    value: row.intAway ?? null,
  }));

  return [
    {
      team: {
        id: match.teams.home.id,
        name: match.teams.home.name,
        logo: event.strHomeTeamBadge || match.teams.home.logo,
      },
      statistics: homeStats,
    },
    {
      team: {
        id: match.teams.away.id,
        name: match.teams.away.name,
        logo: event.strAwayTeamBadge || match.teams.away.logo,
      },
      statistics: awayStats,
    },
  ];
}

function posAbbrev(position?: string | null): string {
  const p = (position ?? "").toLowerCase();
  if (p.includes("goalkeeper") || p.includes("keeper")) return "G";
  if (p.includes("back") || p.includes("defence") || p.includes("defender")) return "D";
  if (p.includes("mid")) return "M";
  if (p.includes("wing") || p.includes("forward") || p.includes("striker")) return "F";
  return "M";
}

export function normalizeTheSportsDbLineups(
  rows: unknown[],
  match: NormalizedMatch,
  event: TsdbEventMeta
): NormalizedLineup[] {
  const typed = rows as TsdbLineupRow[];
  if (!typed.length) return [];

  const homeRows = typed.filter((r) => r.strHome === "Yes");
  const awayRows = typed.filter((r) => r.strHome === "No");

  const mapSide = (
    sideRows: TsdbLineupRow[],
    team: NormalizedMatch["teams"]["home"],
    badge: string
  ): NormalizedLineup => {
    const starters = sideRows.filter((r) => r.strSubstitute === "No");
    const subs = sideRows.filter((r) => r.strSubstitute === "Yes");

    const mapPlayer = (row: TsdbLineupRow) => ({
      player: {
        id: Number(row.idPlayer ?? 0) || 0,
        name: row.strPlayer?.trim() || "Unknown",
        number: Number(row.intSquadNumber ?? 0) || 0,
        pos: posAbbrev(row.strPosition),
        grid: null,
        photo: row.strCutout?.trim() || "",
      },
    });

    return {
      team: { id: team.id, name: team.name, logo: badge || team.logo },
      formation: starters.length >= 10 ? "4-3-3" : "—",
      startXI: starters.map(mapPlayer),
      substitutes: subs.map(mapPlayer),
      coach: { name: "", photo: "" },
    };
  };

  const result: NormalizedLineup[] = [];
  if (homeRows.length) {
    result.push(mapSide(homeRows, match.teams.home, event.strHomeTeamBadge ?? ""));
  }
  if (awayRows.length) {
    result.push(mapSide(awayRows, match.teams.away, event.strAwayTeamBadge ?? ""));
  }

  return result;
}
