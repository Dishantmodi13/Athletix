import type { StandingGroup, StandingRow } from "./football.types";

/** Format API group labels like "GROUP_A" → "Group A". */
export function formatGroupName(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  const normalized = raw.trim();
  if (normalized.toLowerCase() === "matchday") return undefined;

  if (/^GROUP[_\s]?[A-Z]$/i.test(normalized) || /^GROUP_[A-Z]+$/i.test(normalized)) {
    const letter = normalized.replace(/^GROUP[_\s]?/i, "");
    return `Group ${letter.toUpperCase()}`;
  }

  if (normalized.toLowerCase() === "total" || normalized === "REGULAR_SEASON") {
    return undefined;
  }

  if (/^(HOME|AWAY)$/i.test(normalized)) {
    return undefined;
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toStandingGroups(
  tables: Array<{ name?: string; rows: StandingGroup["rows"] }>,
  singleTableLabel = "Standings"
): StandingGroup[] {
  const groups = tables
    .filter((t) => t.rows.length > 0)
    .map((t, index) => ({
      name:
        formatGroupName(t.name) ??
        (tables.length === 1 ? singleTableLabel : `Group ${index + 1}`),
      rows: [...t.rows].sort((a, b) => a.rank - b.rank),
    }));

  if (groups.length <= 1) return groups;

  return groups.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
  );
}

/** Pick World Cup group tables or a single TOTAL table for domestic leagues. */
export function pickStandingsEntries<
  T extends { group?: string | null; type?: string },
>(raw: T[]): T[] {
  const worldCupGroups = raw.filter(
    (s) => s.group && /^GROUP_/i.test(s.group)
  );
  if (worldCupGroups.length > 0) return worldCupGroups;

  const total = raw.find((s) => s.type === "TOTAL");
  if (total) return [total];

  return raw.length > 0 ? [raw[0]] : [];
}

interface GroupMatchTeam {
  id: number;
  name: string;
  crest?: string;
}

export interface GroupStageMatch {
  group?: string | null;
  status: string;
  homeTeam: GroupMatchTeam;
  awayTeam: GroupMatchTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function createStandingRow(team: GroupMatchTeam): Omit<StandingRow, "rank"> {
  return {
    team: { id: team.id, name: team.name, logo: team.crest ?? "" },
    points: 0,
    goalsDiff: 0,
    all: {
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      goals: { for: 0, against: 0 },
    },
    form: "",
  };
}

function compareStandingRows(a: Omit<StandingRow, "rank">, b: Omit<StandingRow, "rank">): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
  if (b.all.goals.for !== a.all.goals.for) return b.all.goals.for - a.all.goals.for;
  return a.team.name.localeCompare(b.team.name);
}

/** Build separate group tables when the API only returns one combined group-stage table. */
export function buildGroupStandingsFromMatches(matches: GroupStageMatch[]): StandingGroup[] {
  const groupMatches = matches.filter((m) => m.group && /^GROUP_/i.test(m.group));
  const byGroup = new Map<string, GroupStageMatch[]>();

  for (const match of groupMatches) {
    const key = match.group!;
    const list = byGroup.get(key) ?? [];
    list.push(match);
    byGroup.set(key, list);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupKey, groupGames]) => {
      const teams = new Map<number, Omit<StandingRow, "rank">>();

      for (const match of groupGames) {
        if (!teams.has(match.homeTeam.id)) {
          teams.set(match.homeTeam.id, createStandingRow(match.homeTeam));
        }
        if (!teams.has(match.awayTeam.id)) {
          teams.set(match.awayTeam.id, createStandingRow(match.awayTeam));
        }

        if (match.status !== "FINISHED") continue;

        const homeGoals = match.score?.fullTime?.home;
        const awayGoals = match.score?.fullTime?.away;
        if (homeGoals == null || awayGoals == null) continue;

        const home = teams.get(match.homeTeam.id)!;
        const away = teams.get(match.awayTeam.id)!;

        home.all.played += 1;
        away.all.played += 1;
        home.all.goals.for += homeGoals;
        home.all.goals.against += awayGoals;
        away.all.goals.for += awayGoals;
        away.all.goals.against += homeGoals;

        if (homeGoals > awayGoals) {
          home.all.win += 1;
          home.points += 3;
          away.all.lose += 1;
        } else if (homeGoals < awayGoals) {
          away.all.win += 1;
          away.points += 3;
          home.all.lose += 1;
        } else {
          home.all.draw += 1;
          away.all.draw += 1;
          home.points += 1;
          away.points += 1;
        }

        home.goalsDiff = home.all.goals.for - home.all.goals.against;
        away.goalsDiff = away.all.goals.for - away.all.goals.against;
      }

      const rows = [...teams.values()]
        .sort(compareStandingRows)
        .map((row, index) => ({ ...row, rank: index + 1 }));

      return {
        name: formatGroupName(groupKey) ?? groupKey,
        rows,
      };
    });
}

export function needsWorldCupGroupSplit(
  leagueId: number,
  entries: Array<{ group?: string | null; table?: unknown[] }>
): boolean {
  if (leagueId !== 1) return false;
  if (entries.some((entry) => entry.group && /^GROUP_/i.test(entry.group))) return false;
  const main = entries.find((entry) => (entry.table?.length ?? 0) > 0);
  return (main?.table?.length ?? 0) > 8;
}
