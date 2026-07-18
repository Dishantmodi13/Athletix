/** Normalized cricket data shared between provider, service, and API responses. */

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
  /** e.g. "New Zealand won toss & fielded" or result summary */
  note: string;
  venue: string | null;
  /** T20I, ODI, Test, etc. */
  format: string | null;
  /** e.g. "1st ODI", "5th T20I" */
  matchLabel: string | null;
  /** 1 = marquee (major nations senior sides, IPL/BBL, ICC), 2 = women/U19 of major nations, 3 = other */
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
