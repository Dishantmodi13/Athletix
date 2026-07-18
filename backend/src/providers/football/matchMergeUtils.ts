export interface TeamStatisticsBlock {
  team?: { id?: number; name?: string; logo?: string };
  statistics?: Array<{ type?: string; value?: number | string | null }>;
}

export function teamStatisticsTypeCount(blocks: unknown[]): number {
  let max = 0;
  for (const block of blocks as TeamStatisticsBlock[]) {
    max = Math.max(max, block.statistics?.length ?? 0);
  }
  return max;
}

export const MIN_LINEUP_STARTERS = 14;

export function lineupStarterCount(lineups: unknown[]): number {
  let total = 0;
  for (const lineup of lineups as Array<{ startXI?: unknown[] }>) {
    total += lineup.startXI?.length ?? 0;
  }
  return total;
}

function lineupGridCount(lineups: unknown[]): number {
  let total = 0;
  for (const lineup of lineups as Array<{ startXI?: Array<{ player?: { grid?: string | null } }> }>) {
    for (const row of lineup.startXI ?? []) {
      if (row.player?.grid) total++;
    }
  }
  return total;
}

export function needsLineupEnrichment(lineups: unknown[]): boolean {
  return lineupStarterCount(lineups) < MIN_LINEUP_STARTERS;
}

/** Pick the statistics set with more metrics per team (not merely 2 team rows). */
export function preferTeamStatistics(current: unknown[], incoming: unknown[]): unknown[] {
  const currentCount = teamStatisticsTypeCount(current);
  const incomingCount = teamStatisticsTypeCount(incoming);
  if (incomingCount > currentCount) return incoming;
  if (currentCount > incomingCount) return current;
  return current.length > 0 ? current : incoming;
}

/** Pick the lineup set with more starters across both sides; prefer sets with grid data. */
export function preferLineups(current: unknown[], incoming: unknown[]): unknown[] {
  const currentGrids = lineupGridCount(current);
  const incomingGrids = lineupGridCount(incoming);
  if (incomingGrids > currentGrids) return incoming;
  if (currentGrids > incomingGrids) return current;

  const currentCount = lineupStarterCount(current);
  const incomingCount = lineupStarterCount(incoming);
  if (incomingCount > currentCount) return incoming;
  if (currentCount > incomingCount) return current;
  return current.length > 0 ? current : incoming;
}
