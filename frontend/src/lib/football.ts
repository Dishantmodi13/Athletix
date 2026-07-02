import { API_URL } from "./api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Match {
  id: number;
  date: string;
  timestamp: number;
  status: { short: string; long: string; elapsed: number | null };
  league: { id: number; name: string; logo: string; country: string; round: string };
  venue: { name: string | null; city: string | null };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface StandingRow {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  form: string;
}

export interface StandingGroup {
  name: string;
  rows: StandingRow[];
}

export interface TopScorer {
  player: { id: number; name: string; photo: string; nationality: string };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    games: { appearences: number | null };
    goals: { total: number | null; assists: number | null };
  }>;
}

export interface BracketTeam {
  id: number;
  name: string;
  code: string;
  logo: string;
  score: number | null;
  winner: boolean | null;
}

export interface BracketMatch {
  id: number;
  date: string;
  status: { short: string; long: string; elapsed: number | null };
  home: BracketTeam;
  away: BracketTeam;
}

export interface BracketSide {
  left: BracketMatch[];
  right: BracketMatch[];
}

export interface MatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo?: string };
  player: { id?: number; name: string };
  assist: { name: string | null };
  type: string;
  detail: string;
  score?: { home: number | null; away: number | null };
}

export interface MatchScoreSummary {
  label: string;
  home: number | null;
  away: number | null;
}

export interface MatchDetails {
  match: Match | null;
  statistics: unknown[];
  events: MatchEvent[];
  lineups: unknown[];
  scoreSummary?: MatchScoreSummary[];
}

export interface KnockoutBracket {
  last32: BracketSide;
  last16: BracketSide;
  quarterFinals: BracketSide;
  semiFinals: BracketSide;
  final: BracketMatch | null;
  thirdPlace: BracketMatch | null;
  champion: { id: number; name: string; code: string; logo: string } | null;
}

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

export function isLive(status: string): boolean {
  return LIVE_STATUSES.includes(status);
}

export function isFinished(status: string): boolean {
  return FINISHED_STATUSES.includes(status);
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

interface FootballResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/football${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = (await res.json()) as FootballResponse<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "Failed to load football data");
  }

  return body.data as T;
}

/** Popular leagues used across the dashboard league tabs. */
export const LEAGUES = [
  { id: 39, name: "Premier League", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 2, name: "Champions League", country: "Europe" },
  { id: 3, name: "Europa League", country: "Europe" },
] as const;

/** All browseable competitions including international tournaments. */
export const COMPETITIONS = [
  ...LEAGUES,
  { id: 1, name: "FIFA World Cup", country: "International" },
] as const;

export function getCompetitionMeta(id: number) {
  return COMPETITIONS.find((c) => c.id === id);
}

export const FIFA_WORLD_CUP_ID = 1;

/** Top 5 European leagues shown on the home dashboard. */
export const TOP_FIVE_LEAGUE_IDS = [39, 140, 135, 78, 61] as const;

/** European club competitions on the home dashboard. */
export const EUROPEAN_COMPETITION_IDS = [2, 3] as const;

/** International tournaments on the home dashboard. */
export const INTERNATIONAL_COMPETITION_IDS = [FIFA_WORLD_CUP_ID] as const;

/** All competition IDs eligible for home-page scorecards and fixtures. */
export const HOME_COMPETITION_IDS = new Set<number>([
  ...INTERNATIONAL_COMPETITION_IDS,
  ...TOP_FIVE_LEAGUE_IDS,
  ...EUROPEAN_COMPETITION_IDS,
]);

/** Competitions for home standings / scorers tabs (World Cup first). */
export const HOME_COMPETITIONS = [
  { id: FIFA_WORLD_CUP_ID, name: "FIFA World Cup", country: "International" },
  ...LEAGUES,
] as const;

export function isHomeCompetition(leagueId: number): boolean {
  return HOME_COMPETITION_IDS.has(leagueId);
}

export function filterHomeMatches(matches: Match[]): Match[] {
  return matches.filter((m) => isHomeCompetition(m.league.id));
}

export function isUpcoming(status: string): boolean {
  return !isLive(status) && !isFinished(status);
}

export const football = {
  live: () => get<Match[]>("/live"),
  fixtures: (date?: string) =>
    get<Match[]>(`/fixtures${date ? `?date=${date}` : ""}`),
  leagueFixtures: (league: number, next = 10) =>
    get<Match[]>(`/fixtures/league?league=${league}&next=${next}`),
  leagueUpcoming: (league: number, limit = 10) =>
    get<Match[]>(`/fixtures/league?league=${league}&next=${limit}&range=upcoming`),
  leagueRecent: (league: number, limit = 10) =>
    get<Match[]>(`/fixtures/league?league=${league}&last=${limit}&range=recent`),
  standings: (league: number) => get<StandingGroup[]>(`/standings?league=${league}`),
  knockout: (league: number) => get<KnockoutBracket | null>(`/knockout?league=${league}`),
  topScorers: (league: number) => get<TopScorer[]>(`/top-scorers?league=${league}`),
  topAssists: (league: number) => get<TopScorer[]>(`/top-assists?league=${league}`),
  leagues: () => get<unknown[]>("/leagues"),
  matchDetails: (id: number) => get<MatchDetails>(`/match/${id}`),
  team: (id: number) =>
    get<{ team: unknown; fixtures: Match[] }>(`/team/${id}`),
  player: (id: number) => get<unknown>(`/player/${id}`),
  search: (q: string) =>
    get<{ teams: unknown[]; players: unknown[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
};
