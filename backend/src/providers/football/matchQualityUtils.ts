import type { MatchDetailsResult } from "./football.types";
import type { NormalizedMatchEvent } from "./matchEventsUtils";
import { MIN_LINEUP_STARTERS } from "./matchMergeUtils";

const FINISHED = new Set(["FT", "AET", "PEN"]);
const LIVE_PHASES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);

function totalGoals(result: MatchDetailsResult): number {
  if (!result.match) return 0;
  return (result.match.goals.home ?? 0) + (result.match.goals.away ?? 0);
}

function lineupPlayerCount(result: MatchDetailsResult): number {
  let total = 0;
  for (const lineup of result.lineups) {
    const row = lineup as { startXI?: unknown[] };
    total += row.startXI?.length ?? 0;
  }
  return total;
}

function statTypeCount(result: MatchDetailsResult): number {
  const first = result.statistics[0] as { statistics?: unknown[] } | undefined;
  return first?.statistics?.length ?? 0;
}

/** Goals that should appear in the goalscorers list (excludes missed pens, VAR cancellations). */
export function isRealScorerEvent(event: NormalizedMatchEvent): boolean {
  if (event.type !== "Goal") return false;
  const detail = (event.detail ?? "").toLowerCase();
  if (detail.includes("missed")) return false;
  if (detail.includes("cancelled")) return false;
  return Boolean(event.player?.name?.trim());
}

export function scoredGoalEventCount(result: MatchDetailsResult): number {
  return result.events.filter(isRealScorerEvent).length;
}

export function expectedGoalTotal(result: MatchDetailsResult): number {
  return totalGoals(result);
}

/** Final score vs goal events in the timeline should agree for finished matches. */
export function goalsAlignWithScore(result: MatchDetailsResult): boolean {
  const expected = expectedGoalTotal(result);
  if (expected === 0) return true;
  return scoredGoalEventCount(result) >= expected;
}

/** True when any timeline, stats, or lineup data exists. */
export function hasAnyMatchDetails(result: MatchDetailsResult): boolean {
  return (
    result.events.length > 0 || result.statistics.length > 0 || result.lineups.length > 0
  );
}

/**
 * True when details are good enough to stop re-fetching.
 * Requires aligned goalscorers, a substantive timeline, stats, and lineups for finished games.
 */
export function isCompleteMatchDetails(result: MatchDetailsResult): boolean {
  if (!result.match || !hasAnyMatchDetails(result)) return false;

  const finished = FINISHED.has(result.match.status.short);
  if (!finished) {
    const liveStarted =
      LIVE_PHASES.has(result.match.status.short) ||
      (result.match.status.elapsed ?? 0) > 0;
    if (liveStarted && lineupPlayerCount(result) < MIN_LINEUP_STARTERS) {
      return false;
    }
    return hasAnyMatchDetails(result);
  }

  const scored = totalGoals(result);
  const players = lineupPlayerCount(result);
  const statTypes = statTypeCount(result);

  if (statTypes < 10 || players < 18) return false;

  if (scored > 0) {
    if (!goalsAlignWithScore(result)) return false;
    if (result.events.length < 8) return false;
    return true;
  }

  return result.events.length >= 5;
}
