import type { NormalizedMatchEvent } from "./matchEventsUtils";
import type { TopScorer } from "./football.types";
import { sortTopAssists } from "./worldCupStats";

interface GoalFeedRow {
  scorer?: { id?: number; name?: string };
  assist?: { id?: number; name?: string } | null;
  team?: { id?: number; name?: string };
  type?: string;
}

interface TeamSide {
  id: number;
  name: string;
  logo: string;
}

export interface AssistAccumulator {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  teamLogo: string;
  assists: number;
  goals: number;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function playerKey(id: number, name: string): string {
  return id > 0 ? `id:${id}` : `name:${normalizeName(name)}`;
}

function resolveTeam(
  teamId: number | undefined,
  teamName: string | undefined,
  home: TeamSide,
  away: TeamSide
): TeamSide {
  if (teamId === home.id) return home;
  if (teamId === away.id) return away;
  if (teamName && teamName === home.name) return home;
  if (teamName && teamName === away.name) return away;
  return {
    id: teamId ?? 0,
    name: teamName ?? "",
    logo: "",
  };
}

function upsertContribution(
  map: Map<string, AssistAccumulator>,
  name: string,
  playerId: number,
  team: TeamSide,
  field: "goals" | "assists"
): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const key = playerKey(playerId, trimmed);
  const current = map.get(key) ?? {
    playerId: playerId > 0 ? playerId : 0,
    playerName: trimmed,
    teamId: team.id,
    teamName: team.name,
    teamLogo: team.logo,
    assists: 0,
    goals: 0,
  };

  current[field] += 1;
  if (playerId > 0 && current.playerId === 0) current.playerId = playerId;
  if (!current.teamLogo && team.logo) current.teamLogo = team.logo;
  map.set(key, current);
}

/** Count goals and assists from football-data goal rows on a single match. */
export function aggregateGoalsFromMatch(
  goals: GoalFeedRow[] | undefined,
  home: TeamSide,
  away: TeamSide,
  target: Map<string, AssistAccumulator>
): void {
  for (const goal of goals ?? []) {
    const type = (goal.type ?? "").toUpperCase();
    if (type === "OWN") continue;

    const team = resolveTeam(goal.team?.id, goal.team?.name, home, away);
    const scorerName = goal.scorer?.name?.trim();
    if (scorerName) {
      upsertContribution(target, scorerName, goal.scorer?.id ?? 0, team, "goals");
    }

    const assistName = goal.assist?.name?.trim();
    if (assistName) {
      upsertContribution(target, assistName, goal.assist?.id ?? 0, team, "assists");
    }
  }
}

/** Count goals and assists from normalized match events. */
export function aggregateFromMatchEvents(
  events: NormalizedMatchEvent[],
  home: TeamSide,
  away: TeamSide,
  target: Map<string, AssistAccumulator>
): void {
  for (const event of events) {
    if (event.type !== "Goal") continue;
    if (event.detail?.toLowerCase().includes("own")) continue;

    const team = resolveTeam(event.team.id, event.team.name, home, away);
    if (event.player.name?.trim()) {
      upsertContribution(target, event.player.name, event.player.id ?? 0, team, "goals");
    }
    if (event.assist.name?.trim()) {
      upsertContribution(target, event.assist.name, 0, team, "assists");
    }
  }
}

export function assistAccumulatorToTopScorers(
  rows: Iterable<AssistAccumulator>
): TopScorer[] {
  const scorers: TopScorer[] = [];

  for (const row of rows) {
    scorers.push({
      player: {
        id: row.playerId,
        name: row.playerName,
        photo: "",
        nationality: "",
      },
      statistics: [
        {
          team: {
            id: row.teamId,
            name: row.teamName,
            logo: row.teamLogo,
          },
          games: { appearences: null },
          goals: { total: row.goals, assists: row.assists },
        },
      ],
    });
  }

  return sortTopAssists(scorers);
}

/** Keep the highest assist total per player when merging provider lists. */
export function mergeAssistLeaderboards(...lists: TopScorer[][]): TopScorer[] {
  const byPlayer = new Map<string, TopScorer>();

  for (const list of lists) {
    for (const row of list) {
      const assists = row.statistics[0]?.goals.assists ?? 0;
      if (assists <= 0) continue;

      const key = playerKey(row.player.id, row.player.name);
      const existing = byPlayer.get(key);
      const existingAssists = existing?.statistics[0]?.goals.assists ?? 0;

      if (!existing || assists > existingAssists) {
        byPlayer.set(key, row);
        continue;
      }

      if (assists === existingAssists) {
        byPlayer.set(key, {
          ...existing,
          player: {
            ...existing.player,
            id: existing.player.id || row.player.id,
            photo: existing.player.photo || row.player.photo,
            nationality: existing.player.nationality || row.player.nationality,
          },
          statistics: [
            {
              ...existing.statistics[0]!,
              goals: {
                total: Math.max(
                  existing.statistics[0]?.goals.total ?? 0,
                  row.statistics[0]?.goals.total ?? 0
                ),
                assists,
              },
            },
          ],
        });
      }
    }
  }

  return sortTopAssists([...byPlayer.values()]);
}
