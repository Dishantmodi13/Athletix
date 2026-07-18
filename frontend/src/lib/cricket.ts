import { API_URL } from "./api";

/* ------------------------------------------------------------------ */
/* Types (mirrors backend cricket.types)                               */
/* ------------------------------------------------------------------ */

export type CricketMatchState = "live" | "upcoming" | "finished";

export interface CricketTeamScore {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  winner: boolean | null;
}

export interface CricketMatch {
  id: string;
  leagueId: string;
  series: string;
  name: string;
  shortName: string;
  date: string;
  state: CricketMatchState;
  statusText: string;
  note: string;
  venue: string | null;
  format: string | null;
  matchLabel: string | null;
  tier: 1 | 2 | 3;
  teams: CricketTeamScore[];
}

export interface CricketBattingLine {
  name: string;
  dismissal: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  notOut: boolean;
  order: number;
}

export interface CricketBowlingLine {
  name: string;
  overs: string;
  maidens: number;
  conceded: number;
  wickets: number;
  economy: string;
  order: number;
}

export interface CricketInnings {
  title: string;
  battingTeam: string;
  bowlingTeam: string;
  score: string;
  runs: number;
  wickets: number;
  overs: string;
  target: number | null;
  batting: CricketBattingLine[];
  bowling: CricketBowlingLine[];
}

export interface CricketMatchDetails {
  match: CricketMatch | null;
  innings: CricketInnings[];
  playerOfTheMatch?: CricketPlayerOfTheMatch | null;
}

export interface CricketPlayerOfTheMatch {
  player: { id: string; name: string; photo: string };
  team: { id: string; name: string; logo: string };
  statLabel: string;
  statValue: string;
  provisional?: boolean;
}

export interface CricketSeries {
  leagueId: string;
  name: string;
  matches: CricketMatch[];
}

export interface CricketCompetition {
  leagueId: string | null;
  name: string;
  description: string;
  category: "icc" | "league";
  matches: CricketMatch[];
}

export interface CricketCompetitionsResponse {
  featured: CricketCompetition[];
  active: CricketSeries[];
}

export interface CricketHomeResponse {
  live: CricketMatch[];
  featured: CricketSeries[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function cricketMatchRoute(match: Pick<CricketMatch, "id" | "leagueId">): string {
  return `/dashboard/cricket/match/${match.leagueId}/${match.id}`;
}

/** True when the batter is still not out at the crease (excludes retired hurt/out). */
export function isAtCreaseBatter(line: Pick<CricketBattingLine, "notOut" | "dismissal">): boolean {
  if (!line.notOut) return false;
  const lower = line.dismissal.trim().toLowerCase();
  return !lower.includes("retired");
}

export function battingDismissalLabel(line: Pick<CricketBattingLine, "dismissal">): string {
  const lower = line.dismissal.trim().toLowerCase();
  if (lower.includes("retired hurt")) return "retired hurt";
  return line.dismissal;
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

interface CricketResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/cricket${path}`, {
    headers: { "Content-Type": "application/json" },
  });

  const body = (await res.json()) as CricketResponse<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "Failed to load cricket data");
  }

  return body.data as T;
}

export const cricket = {
  home: () => get<CricketHomeResponse>("/home"),
  matches: () => get<CricketMatch[]>("/matches"),
  live: () => get<CricketMatch[]>("/live"),
  fixtures: () => get<CricketMatch[]>("/fixtures"),
  series: () => get<CricketSeries[]>("/series"),
  featuredSeries: () => get<CricketSeries[]>("/series/featured"),
  competitions: () => get<CricketCompetitionsResponse>("/competitions"),
  matchDetails: (leagueId: string, eventId: string) =>
    get<CricketMatchDetails>(`/match/${leagueId}/${eventId}`),
};
