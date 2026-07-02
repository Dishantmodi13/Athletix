import { env } from "../config/env";

/** Competitions that use a non-standard season year. */
const LEAGUE_SEASON_OVERRIDES: Record<number, number> = {
  1: 2026, // FIFA World Cup
};

/**
 * Compute the active European football season start year.
 * Aug–Dec → current year; Jan–Jul → previous year (e.g. Jun 2026 → 2025/26).
 */
export function computeCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Football seasons are labeled by the year they start (e.g. 2025/26 → 2025).
 */
export function resolveFootballSeason(requested?: number, leagueId?: number): number {
  if (requested !== undefined && Number.isFinite(requested)) {
    return requested;
  }
  if (leagueId !== undefined && LEAGUE_SEASON_OVERRIDES[leagueId] !== undefined) {
    return LEAGUE_SEASON_OVERRIDES[leagueId];
  }
  return env.footballDefaultSeason || computeCurrentSeason();
}

export function dateISOWithOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
