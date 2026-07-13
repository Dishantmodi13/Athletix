import type { FixtureRange } from "./fixturesUtils";

export interface NormalizedMatch {
  id: number;
  date: string;
  timestamp: number;
  status: { short: string; long: string; elapsed: number | null };
  league: { id: number; name: string; logo: string; country: string; round: string };
  venue: { name: string | null; city: string | null };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      shortName?: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      shortName?: string;
      winner: boolean | null;
    };
  };
  goals: { home: number | null; away: number | null };
  /** Tournament stage from football-data (e.g. LAST_32, FINAL). */
  stage?: string | null;
  /** Bracket slot within the stage (football-data matchday). */
  matchday?: number | null;
  /** Which provider served this match (used for detail lookups). */
  source?: string;
  /** API-Football fixture id for rich match details when source is football-data. */
  detailFixtureId?: number;
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

/** One standings table — used for league tables and World Cup groups. */
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

export interface NormalizedMatchEvent {
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

export interface MatchDetailsMeta {
  status: "full" | "limited" | "pending";
  message?: string;
}

export interface MatchDetailsResult {
  match: NormalizedMatch | null;
  statistics: unknown[];
  events: NormalizedMatchEvent[];
  lineups: unknown[];
  scoreSummary?: MatchScoreSummary[];
  meta?: MatchDetailsMeta;
}

export interface SearchResult {
  teams: unknown[];
  players: unknown[];
}

export interface FootballProvider {
  readonly name: string;
  isAvailable(): boolean;
  getLiveMatches(): Promise<NormalizedMatch[]>;
  getFixturesByDate(date: string): Promise<NormalizedMatch[]>;
  getFixturesByLeague(
    league: number,
    season: number,
    limit?: number,
    range?: FixtureRange
  ): Promise<NormalizedMatch[]>;
  getStandings(league: number, season: number): Promise<StandingGroup[]>;
  getTopScorers(league: number, season: number): Promise<TopScorer[]>;
  getTopAssists(league: number, season: number): Promise<TopScorer[]>;
  getMatchDetails(id: number): Promise<MatchDetailsResult>;
  getTeam(id: number): Promise<unknown>;
  getTeamFixtures(team: number, season: number): Promise<NormalizedMatch[]>;
  getPlayer(id: number, season: number): Promise<unknown>;
  search(query: string): Promise<SearchResult>;
}
