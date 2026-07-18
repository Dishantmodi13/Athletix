import type { NormalizedLineup } from "./lineupUtils";
import type { MatchDetailsResult, NormalizedMatch } from "./football.types";

export interface PlayerOfTheMatch {
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  rating: number | null;
  goals: number | null;
  assists: number | null;
  /** True when derived from live ratings before full-time. */
  provisional?: boolean;
}

export interface FixturePlayerStat {
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  rating: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function photoFromLineups(
  lineups: unknown[],
  playerName: string,
  teamId?: number
): string {
  for (const raw of lineups as NormalizedLineup[]) {
    if (!raw?.team) continue;
    if (teamId && raw.team.id !== teamId) continue;

    const players = [
      ...(raw.startXI ?? []).map((row) => row.player),
      ...(raw.substitutes ?? []).map((row) => row.player),
    ];

    for (const player of players) {
      if (namesMatch(player.name, playerName) && player.photo?.trim()) {
        return player.photo;
      }
    }
  }

  if (teamId) {
    return photoFromLineups(lineups, playerName);
  }

  return "";
}

function parseRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function pickPlayerOfTheMatchFromStats(
  stats: FixturePlayerStat[],
  lineups: unknown[] = []
): PlayerOfTheMatch | null {
  let best: FixturePlayerStat | null = null;

  for (const row of stats) {
    if (!row.player.name?.trim()) continue;
    if (row.minutes !== null && row.minutes <= 0) continue;

    const rating = row.rating ?? 0;
    const bestRating = best?.rating ?? 0;
    if (!best || rating > bestRating) {
      best = row;
      continue;
    }

    if (rating === bestRating && rating > 0) {
      const goals = row.goals ?? 0;
      const bestGoals = best.goals ?? 0;
      if (goals > bestGoals) best = row;
    }
  }

  if (!best) return null;

  const photo =
    best.player.photo?.trim() ||
    photoFromLineups(lineups, best.player.name, best.team.id) ||
    (best.player.id
      ? `https://media.api-sports.io/football/players/${best.player.id}.png`
      : "");

  return {
    player: {
      id: best.player.id,
      name: best.player.name,
      photo,
    },
    team: best.team,
    rating: best.rating,
    goals: best.goals,
    assists: best.assists,
  };
}

export function parseApiFootballFixturePlayers(raw: unknown[]): FixturePlayerStat[] {
  const rows: FixturePlayerStat[] = [];

  for (const teamBlock of raw as Array<{
    team?: { id?: number; name?: string; logo?: string };
    players?: Array<{
      player?: { id?: number; name?: string; photo?: string };
      statistics?: Array<{
        games?: { rating?: string | number | null; minutes?: number | null };
        goals?: { total?: number | null; assists?: number | null };
      }>;
    }>;
  }>) {
    const team = teamBlock.team;
    if (!team?.id || !team.name) continue;

    for (const entry of teamBlock.players ?? []) {
      const player = entry.player;
      const stat = entry.statistics?.[0];
      if (!player?.name) continue;

      rows.push({
        player: {
          id: player.id ?? 0,
          name: player.name,
          photo: player.photo?.trim() ?? "",
        },
        team: {
          id: team.id,
          name: team.name,
          logo: team.logo ?? "",
        },
        rating: parseRating(stat?.games?.rating),
        goals: stat?.goals?.total ?? null,
        assists: stat?.goals?.assists ?? null,
        minutes: stat?.games?.minutes ?? null,
      });
    }
  }

  return rows;
}

function goalContributionsFromEvents(
  details: MatchDetailsResult
): Map<string, { name: string; goals: number; assists: number; teamId: number; teamName: string; teamLogo: string }> {
  const map = new Map<
    string,
    { name: string; goals: number; assists: number; teamId: number; teamName: string; teamLogo: string }
  >();

  for (const event of details.events) {
    if (event.type !== "Goal") continue;
    if (event.detail?.toLowerCase().includes("missed")) continue;

    const playerName = event.player.name?.trim();
    if (playerName) {
      const key = normalizeName(playerName);
      const current = map.get(key) ?? {
        name: playerName,
        goals: 0,
        assists: 0,
        teamId: event.team.id ?? 0,
        teamName: event.team.name,
        teamLogo: event.team.logo ?? "",
      };
      current.goals += 1;
      map.set(key, current);
    }

    const assistName = event.assist.name?.trim();
    if (assistName) {
      const key = normalizeName(assistName);
      const current = map.get(key) ?? {
        name: assistName,
        goals: 0,
        assists: 0,
        teamId: event.team.id ?? 0,
        teamName: event.team.name,
        teamLogo: event.team.logo ?? "",
      };
      current.assists += 1;
      map.set(key, current);
    }
  }

  return map;
}

function pickFromGoalEvents(
  details: MatchDetailsResult,
  match: NormalizedMatch
): PlayerOfTheMatch | null {
  const contributions = goalContributionsFromEvents(details);
  if (contributions.size === 0) return null;

  let best: {
    name: string;
    goals: number;
    assists: number;
    teamId: number;
    teamName: string;
    teamLogo: string;
  } | null = null;

  for (const row of contributions.values()) {
    const score = row.goals * 3 + row.assists;
    const bestScore = best ? best.goals * 3 + best.assists : -1;
    if (!best || score > bestScore) {
      best = row;
    }
  }

  if (!best) return null;

  const team =
    best.teamId === match.teams.home.id
      ? match.teams.home
      : best.teamId === match.teams.away.id
        ? match.teams.away
        : { id: best.teamId, name: best.teamName, logo: best.teamLogo };

  const photo = photoFromLineups(details.lineups, best.name, team.id);

  return {
    player: { id: 0, name: best.name, photo },
    team: { id: team.id, name: team.name, logo: team.logo },
    rating: null,
    goals: best.goals,
    assists: best.assists,
  };
}

export function resolveFootballPlayerOfTheMatch(
  details: MatchDetailsResult,
  fixturePlayerStats: FixturePlayerStat[] = []
): PlayerOfTheMatch | null {
  if (!details.match) return null;

  const finished = ["FT", "AET", "PEN"].includes(details.match.status.short);
  const live = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(details.match.status.short);
  if (!finished && !live) return null;

  const fromRatings = pickPlayerOfTheMatchFromStats(fixturePlayerStats, details.lineups);
  if (fromRatings) {
    return {
      ...fromRatings,
      provisional: !finished,
    };
  }

  if (finished) {
    return pickFromGoalEvents(details, details.match);
  }

  return null;
}
