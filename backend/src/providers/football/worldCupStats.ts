import type { TopScorer } from "./football.types";

type ScorerRow = {
  player: { id: number; name: string; nationality?: string };
  team: { id: number; name: string; crest?: string };
  goals: number;
  assists?: number | null;
  playedMatches?: number;
};

type TournamentMatch = {
  homeTeam: { id: number };
  awayTeam: { id: number };
};

export function collectNationalTeamIds(matches: TournamentMatch[]): Set<number> {
  const ids = new Set<number>();
  for (const match of matches) {
    ids.add(match.homeTeam.id);
    ids.add(match.awayTeam.id);
  }
  return ids;
}

/** Drop club-side rows that can leak into tournament scorer feeds. */
export function filterTournamentScorers(
  scorers: ScorerRow[],
  nationalTeamIds: Set<number>
): ScorerRow[] {
  if (nationalTeamIds.size === 0) return scorers;
  return scorers.filter((row) => nationalTeamIds.has(row.team.id));
}

export function sortTopScorers(rows: TopScorer[]): TopScorer[] {
  return [...rows].sort(
    (a, b) => (b.statistics[0]?.goals.total ?? 0) - (a.statistics[0]?.goals.total ?? 0)
  );
}

export function sortTopAssists(rows: TopScorer[]): TopScorer[] {
  return [...rows]
    .filter((s) => (s.statistics[0]?.goals.assists ?? 0) > 0)
    .sort((a, b) => {
      const assistsDiff =
        (b.statistics[0]?.goals.assists ?? 0) - (a.statistics[0]?.goals.assists ?? 0);
      if (assistsDiff !== 0) return assistsDiff;
      return (b.statistics[0]?.goals.total ?? 0) - (a.statistics[0]?.goals.total ?? 0);
    });
}
