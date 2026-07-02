import type { NormalizedMatch } from "./football.types";

export const FINISHED_STATUSES = new Set([
  "FT",
  "AET",
  "PEN",
  "CANC",
  "ABD",
  "AWD",
  "WO",
]);

export type FixtureRange = "upcoming" | "recent" | "mixed";

export function pickLeagueFixtures(
  matches: NormalizedMatch[],
  limit: number,
  range: FixtureRange = "mixed"
): NormalizedMatch[] {
  const nowSec = Math.floor(Date.now() / 1000);

  const upcoming = matches
    .filter((m) => m.timestamp >= nowSec && !FINISHED_STATUSES.has(m.status.short))
    .sort((a, b) => a.timestamp - b.timestamp);

  const recent = matches
    .filter((m) => FINISHED_STATUSES.has(m.status.short))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (range === "upcoming") {
    return upcoming.slice(0, limit);
  }

  if (range === "recent") {
    return recent.slice(0, limit);
  }

  if (upcoming.length >= limit) {
    return upcoming.slice(0, limit);
  }

  const combined = [...upcoming, ...recent].slice(0, limit);
  return combined.length > 0 ? combined : matches.slice(-limit);
}
