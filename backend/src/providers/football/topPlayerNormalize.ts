import type { TopScorer } from "./football.types";
import { sortTopAssists, sortTopScorers } from "./worldCupStats";

interface RawTopPlayerStat {
  team?: { id?: number; name?: string; logo?: string };
  league?: { id?: number; name?: string };
  games?: {
    appearences?: number | null;
    appearances?: number | null;
  };
  goals?: {
    total?: number | null;
    assists?: number | null;
  };
}

interface RawTopPlayerRow {
  player?: {
    id?: number;
    name?: string;
    photo?: string;
    nationality?: string;
  };
  statistics?: RawTopPlayerStat[];
}

function pickLeagueStat(
  statistics: RawTopPlayerStat[] | undefined,
  leagueId: number
): RawTopPlayerStat | undefined {
  if (!statistics?.length) return undefined;

  const forLeague = statistics.filter((s) => s.league?.id === leagueId);
  if (forLeague.length === 1) return forLeague[0];

  if (forLeague.length > 1) {
    return forLeague.reduce((best, row) => {
      const assists = row.goals?.assists ?? 0;
      const bestAssists = best.goals?.assists ?? 0;
      return assists > bestAssists ? row : best;
    });
  }

  return statistics[0];
}

function mapTopPlayerRow(row: RawTopPlayerRow, leagueId: number): TopScorer | null {
  const player = row.player;
  if (!player?.name?.trim()) return null;

  const stat = pickLeagueStat(row.statistics, leagueId);
  if (!stat?.team?.name) return null;

  const appearances =
    stat.games?.appearences ?? stat.games?.appearances ?? null;

  return {
    player: {
      id: player.id ?? 0,
      name: player.name,
      photo: player.photo ?? "",
      nationality: player.nationality ?? "",
    },
    statistics: [
      {
        team: {
          id: stat.team.id ?? 0,
          name: stat.team.name ?? "Team",
          logo: stat.team.logo ?? "",
        },
        games: { appearences: appearances },
        goals: {
          total: stat.goals?.total ?? null,
          assists: stat.goals?.assists ?? null,
        },
      },
    ],
  };
}

export function normalizeApiFootballTopScorers(
  raw: unknown[],
  leagueId: number
): TopScorer[] {
  const rows = (raw as RawTopPlayerRow[])
    .map((row) => mapTopPlayerRow(row, leagueId))
    .filter((row): row is TopScorer => row !== null);

  return sortTopScorers(rows);
}

export function normalizeApiFootballTopAssists(
  raw: unknown[],
  leagueId: number
): TopScorer[] {
  const rows = (raw as RawTopPlayerRow[])
    .map((row) => mapTopPlayerRow(row, leagueId))
    .filter((row): row is TopScorer => row !== null);

  return sortTopAssists(rows);
}
