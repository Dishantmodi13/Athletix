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
  detailFixtureId?: number;
}

/** Route id for match detail pages — always use the canonical fixture id from listings. */
export function matchDetailRouteId(match: Pick<Match, "id" | "detailFixtureId">): number {
  return match.id;
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
  meta?: {
    status: "full" | "limited" | "pending";
    message?: string;
  };
  playerOfTheMatch?: PlayerOfTheMatch | null;
}

export interface PlayerOfTheMatch {
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  rating: number | null;
  goals: number | null;
  assists: number | null;
  provisional?: boolean;
}

export interface PlayerDetails {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number | null;
    nationality: string;
    height: string | null;
    weight: string | null;
    photo: string;
    birth: { date: string | null; place?: string | null; country?: string | null };
    position?: string | null;
    number?: number | null;
  };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    league: { name: string; season: number };
    games: { appearences: number | null; position: string | null };
    goals: { total: number | null; assists: number | null };
    cards: { yellow: number | null; red: number | null };
  }>;
  source?: string;
  club?: { name: string; logo: string };
}

export function playerRoute(id: number, name?: string): string {
  if (!name?.trim()) return `/dashboard/player/${id}`;
  return `/dashboard/player/${id}?name=${encodeURIComponent(name.trim())}`;
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

const CLIENT_CACHE = new Map<string, { at: number; data: unknown }>();

async function get<T>(path: string, init?: RequestInit, clientCacheMs = 0): Promise<T> {
  if (clientCacheMs > 0) {
    const hit = CLIENT_CACHE.get(path);
    if (hit && Date.now() - hit.at < clientCacheMs) {
      return hit.data as T;
    }
  }

  const res = await fetch(`${API_URL}/football${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = (await res.json()) as FootballResponse<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "Failed to load football data");
  }

  const data = body.data as T;
  if (clientCacheMs > 0) {
    CLIENT_CACHE.set(path, { at: Date.now(), data });
  }
  return data;
}

export interface FootballHomeData {
  worldCupFocus: boolean;
  defaultLeague: number;
  live: Match[];
  today: Match[];
  featuredUpcoming: Match[];
  featuredRecent: Match[];
  standings: StandingGroup[];
  scorers: TopScorer[];
  sidebarUpcoming: Match[];
  sidebarScorers: TopScorer[];
}

/** Popular leagues used across the dashboard league tabs. */
export const LEAGUES = [
  { id: 39, name: "Premier League", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 2, name: "Champions League", country: "Europe" },
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
export const FIFA_WORLD_CUP_NAME = "FIFA World Cup";
export const WORLD_CUP_LEAGUE_LOGO = "https://crests.football-data.org/wm26.png";

/** World Cup tournament ends 20 July 2026 — home feed switches to top leagues after this. */
export const WORLD_CUP_END_DATE = "2026-07-20";

export function isWorldCupFocusActive(now = new Date()): boolean {
  const end = new Date(`${WORLD_CUP_END_DATE}T23:59:59`);
  return now < end;
}

export function getDefaultHomeLeagueId(now = new Date()): number {
  return isWorldCupFocusActive(now) ? FIFA_WORLD_CUP_ID : TOP_FIVE_LEAGUE_IDS[0];
}

export function teamRoute(id: number, name?: string): string {
  if (!name?.trim()) return `/dashboard/team/${id}`;
  return `/dashboard/team/${id}?name=${encodeURIComponent(name.trim())}`;
}

export function matchInvolvesTeam(match: Match, teamId: number): boolean {
  return match.teams.home.id === teamId || match.teams.away.id === teamId;
}

export function normalizeTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export interface FollowedTeamRef {
  id: number;
  name: string;
}

export function matchIncludesFollowedTeam(match: Match, followed: FollowedTeamRef[]): boolean {
  if (followed.length === 0) return false;

  const ids = new Set(followed.map((team) => team.id));
  const names = new Set(
    followed.map((team) => normalizeTeamName(team.name)).filter(Boolean)
  );
  const homeName = normalizeTeamName(match.teams.home.name);
  const awayName = normalizeTeamName(match.teams.away.name);

  return (
    ids.has(match.teams.home.id) ||
    ids.has(match.teams.away.id) ||
    names.has(homeName) ||
    names.has(awayName)
  );
}

export function filterFollowedMatches(matches: Match[], followed: FollowedTeamRef[]): Match[] {
  if (followed.length === 0) return [];
  return dedupeMatches(matches).filter((match) => matchIncludesFollowedTeam(match, followed));
}

function matchFixtureKey(match: Match): string {
  const home = normalizeTeamName(match.teams.home.name);
  const away = normalizeTeamName(match.teams.away.name);
  const [a, b] = [home, away].sort();
  const day = match.date.split("T")[0]!;
  return `${a}|${b}|${day}`;
}

function preferMatch(a: Match, b: Match): Match {
  let chosen: Match;
  let other: Match;

  const aLive = isLive(a.status.short);
  const bLive = isLive(b.status.short);
  if (aLive && !bLive) {
    chosen = a;
    other = b;
  } else if (bLive && !aLive) {
    chosen = b;
    other = a;
  } else if (a.league.id === FIFA_WORLD_CUP_ID && b.league.id === FIFA_WORLD_CUP_ID) {
    const aFd = a.league.logo.includes("football-data.org");
    const bFd = b.league.logo.includes("football-data.org");
    if (aFd && !bFd) {
      chosen = a;
      other = b;
    } else if (bFd && !aFd) {
      chosen = b;
      other = a;
    } else {
      chosen = a;
      other = b;
    }
  } else if (a.detailFixtureId && a.detailFixtureId !== a.id) {
    chosen = a;
    other = b;
  } else if (b.detailFixtureId && b.detailFixtureId !== b.id) {
    chosen = b;
    other = a;
  } else {
    chosen = a;
    other = b;
  }

  return normalizeMatchBranding(chosen, other);
}

function normalizeMatchBranding(primary: Match, secondary?: Match): Match {
  if (primary.league.id !== FIFA_WORLD_CUP_ID) return primary;

  const fdLeague = [primary, secondary]
    .filter(Boolean)
    .map((match) => match!.league)
    .find((league) => league.logo?.includes("football-data.org"));

  const logo = fdLeague?.logo || primary.league.logo || secondary?.league.logo;
  const safeLogo =
    logo && !logo.includes("api-sports.io") ? logo : WORLD_CUP_LEAGUE_LOGO;

  return {
    ...primary,
    league: {
      ...primary.league,
      name: FIFA_WORLD_CUP_NAME,
      logo: safeLogo,
    },
    detailFixtureId:
      primary.detailFixtureId ??
      (secondary && secondary.id !== primary.id ? secondary.id : undefined),
  };
}

export function leagueDisplayLogo(match: Pick<Match, "league">): string {
  if (match.league.id === FIFA_WORLD_CUP_ID) {
    const logo = match.league.logo?.trim();
    if (!logo || logo.includes("api-sports.io")) return WORLD_CUP_LEAGUE_LOGO;
  }
  return match.league.logo;
}

export function leagueDisplayName(match: Pick<Match, "league">): string {
  if (match.league.id === FIFA_WORLD_CUP_ID) return FIFA_WORLD_CUP_NAME;
  return match.league.name;
}

/** Collapse duplicate fixtures from different provider ids. */
export function dedupeMatches(matches: Match[]): Match[] {
  const byKey = new Map<string, Match>();
  for (const match of matches) {
    const key = matchFixtureKey(match);
    const existing = byKey.get(key);
    const merged = existing ? preferMatch(existing, match) : normalizeMatchBranding(match);
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}

export function sortMatchesFollowedFirst(matches: Match[], followed: FollowedTeamRef[]): Match[] {
  if (followed.length === 0) return matches;
  return [...matches].sort((a, b) => {
    const aFollowed = matchIncludesFollowedTeam(a, followed);
    const bFollowed = matchIncludesFollowedTeam(b, followed);
    if (aFollowed === bFollowed) return a.timestamp - b.timestamp;
    return aFollowed ? -1 : 1;
  });
}

function encodeFollowedTeams(teams: FollowedTeamRef[]): string {
  return teams.map((team) => `${team.id}:${encodeURIComponent(team.name)}`).join(",");
}

export function isTopLeagueMatch(match: Match): boolean {
  return TOP_FIVE_LEAGUE_IDS.includes(match.league.id as (typeof TOP_FIVE_LEAGUE_IDS)[number]);
}

/** Top 5 European leagues shown on the home dashboard. */
export const TOP_FIVE_LEAGUE_IDS = [39, 140, 135, 78, 61] as const;

/** European club competitions on the home dashboard. */
export const EUROPEAN_COMPETITION_IDS = [2] as const;

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
  home: () => get<FootballHomeData>("/home", undefined, 30_000),
  followedMatches: (teams: FollowedTeamRef[]) =>
    get<Match[]>(
      `/followed-matches?teams=${encodeFollowedTeams(teams)}`,
      undefined,
      30_000
    ),
  live: () => get<Match[]>("/live", undefined, 20_000),
  fixtures: (date?: string) =>
    get<Match[]>(`/fixtures${date ? `?date=${date}` : ""}`, undefined, 60_000),
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
  team: (id: number, name?: string) =>
    get<{ team: unknown; fixtures: Match[] }>(
      `/team/${id}${name ? `?name=${encodeURIComponent(name)}` : ""}`,
      undefined,
      120_000
    ),
  player: (id: number, name?: string) =>
    get<PlayerDetails>(
      `/player/${id}${name ? `?name=${encodeURIComponent(name)}` : ""}`
    ),
  search: (q: string) =>
    get<{ teams: unknown[]; players: unknown[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
};
