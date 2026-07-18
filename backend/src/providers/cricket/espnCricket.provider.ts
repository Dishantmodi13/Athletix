import { AppError } from "../../middleware/errorHandler";
import type {
  CricketBattingLine,
  CricketBowlingLine,
  CricketInnings,
  CricketMatch,
  CricketMatchDetails,
  CricketMatchState,
  CricketPlayerOfTheMatch,
  CricketSeries,
} from "./cricket.types";

const HEADER_URL =
  "https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket";
const SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports/cricket";
const SUMMARY_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/cricket";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "application/json",
};

/** Full-member nations whose senior sides are always featured. */
const MAJOR_NATIONS = [
  "india",
  "australia",
  "england",
  "new zealand",
  "south africa",
  "sri lanka",
  "west indies",
  "pakistan",
  "bangladesh",
  "afghanistan",
];

const FEATURED_SERIES_KEYWORDS = [
  "indian premier league",
  "big bash",
  "world cup",
  "champions trophy",
  "world test championship",
  "the ashes",
  "asia cup",
];

/** Always fetch these tour league IDs (senior bilateral / marquee tours). */
const PRIORITY_LEAGUE_IDS = [
  "23810", // India tour of England 2026
  "24438", // New Zealand tour of West Indies 2026
  "24300", // India in Zimbabwe T20I Series 2026
  "24420", // Bangladesh tour of Zimbabwe 2026
  "24270", // New Zealand tour of Australia 2026/27
  "24460", // Sri Lanka in New Zealand 2026/27
  "23800", // Sri Lanka in England ODI Series 2026
];

const LEAGUE_SCAN_MIN = 23700;
const LEAGUE_SCAN_MAX = 24600;
const LEAGUE_SCAN_BATCH = 30;

let discoveredLeagueIdsCache: { ids: string[]; at: number } | null = null;
const DISCOVERY_CACHE_MS = 6 * 60 * 60 * 1000;
let discoveryInProgress = false;

const leagueMatchesCache = new Map<string, { matches: CricketMatch[]; at: number }>();
const LEAGUE_MATCHES_CACHE_MS = 15 * 60 * 1000;
const LEAGUE_CACHE_VERSION = "v4";

function extractFormatMeta(input: {
  title?: string;
  description?: string;
  classCard?: string;
}): { format: string | null; matchLabel: string | null } {
  const desc = input.description ?? "";
  const title = input.title?.trim() ?? "";
  const combined = `${title} ${desc}`;

  let format = input.classCard ?? null;
  if (!format) {
    if (/\bt20/i.test(combined)) format = "T20I";
    else if (/\bodi\b/i.test(combined)) format = "ODI";
    else if (/\btest\b/i.test(combined)) format = "Test";
  }
  if (format === "T20") format = "T20I";

  let matchLabel = title || null;
  if (!matchLabel && desc) {
    const m = desc.match(/^(\d+(?:st|nd|rd|th)\s+(?:T20I?|ODI|Test(?:\s+Match)?))/i);
    if (m) matchLabel = m[1]!.trim();
  }

  return { format, matchLabel };
}

const ACTIVE_PAST_DAYS = 21;
const ACTIVE_FUTURE_DAYS = 45;

function formatEspnDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError("Unable to reach cricket data source", 502);
  }

  if (!res.ok) {
    throw new AppError(`Cricket API HTTP ${res.status}`, res.status === 404 ? 404 : 502);
  }

  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Raw ESPN shapes (only the fields we read)                           */
/* ------------------------------------------------------------------ */

interface RawTeamRef {
  id?: string;
  displayName?: string;
  name?: string;
  abbreviation?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
}

interface RawCompetitor {
  id?: string;
  displayName?: string;
  name?: string;
  abbreviation?: string;
  logo?: string;
  score?: string;
  winner?: boolean;
  team?: RawTeamRef;
  linescores?: RawCompetitorLinescore[];
}

interface RawCompetitorLinescore {
  period?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
  score?: string;
  isBatting?: boolean;
  target?: number;
}

interface RawHeaderEvent {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: string;
  summary?: string;
  note?: string;
  location?: string;
  title?: string;
  description?: string;
  class?: { generalClassCard?: string; internationalClassCard?: string };
  fullStatus?: { type?: { state?: string; description?: string; detail?: string } };
  competitors?: RawCompetitor[];
}

interface RawHeaderLeague {
  id?: number | string;
  name?: string;
  abbreviation?: string;
  events?: RawHeaderEvent[];
}

interface RawScoreboardEvent {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: {
    type?: { state?: string; description?: string; detail?: string };
    summary?: string;
  };
  competitions?: Array<{
    description?: string;
    competitors?: RawCompetitor[];
    venue?: { fullName?: string };
    status?: { summary?: string; type?: { state?: string; description?: string } };
    class?: { generalClassCard?: string; internationalClassCard?: string };
  }>;
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

function mapState(state: string | undefined): CricketMatchState {
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "upcoming";
}

function teamFromCompetitor(c: RawCompetitor): CricketMatch["teams"][number] {
  const team = c.team ?? {};
  return {
    id: String(c.id ?? team.id ?? ""),
    name: c.displayName ?? c.name ?? team.displayName ?? team.name ?? "TBC",
    abbreviation: c.abbreviation ?? team.abbreviation ?? "",
    logo: c.logo ?? team.logo ?? team.logos?.[0]?.href ?? "",
    score: c.score ?? "",
    winner: typeof c.winner === "boolean" ? c.winner : null,
  };
}

function nationsInSeriesName(seriesName: string): string[] {
  const lower = seriesName.toLowerCase();
  return MAJOR_NATIONS.filter((nation) => lower.includes(nation));
}

function matchBelongsToSeries(match: CricketMatch, seriesName: string): boolean {
  const lower = seriesName.toLowerCase();

  if (lower.includes("indian premier league") || lower.includes("big bash")) {
    return match.series === seriesName;
  }

  const nations = nationsInSeriesName(seriesName);
  if (nations.length >= 2) {
    const teamText = match.teams.map((t) => t.name.toLowerCase()).join(" ");
    return nations.every((nation) => teamText.includes(nation));
  }

  if (nations.length === 1) {
    const teamText = match.teams.map((t) => t.name.toLowerCase()).join(" ");
    return teamText.includes(nations[0]!);
  }

  return match.series === seriesName;
}

function isSeniorNationTeam(teamName: string): boolean {
  const lower = teamName.toLowerCase().trim();
  return MAJOR_NATIONS.includes(lower);
}

function mentionsMajorNation(teamName: string): boolean {
  const lower = teamName.toLowerCase();
  return MAJOR_NATIONS.some((nation) => lower.includes(nation));
}

async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isYouthOrWomen(text: string): boolean {
  return /women|under-19|under 19|u19|u-19|lions|emerging players|a team|2nd xi|second eleven/i.test(
    text
  );
}

function isMinorSeries(seriesName: string): boolean {
  return /qualifier|sub.?regional|associate|shpageeza|domestic t20|eleven championship|youth test|youth odi|unofficial|tri-series.*2024|tour of denmark|tour of finland|tour of estonia|tour of croatia|tour of sweden|tour of norway|tour of jersey|tour of malaysia/i.test(
    seriesName.toLowerCase()
  );
}

export function isSeniorFeaturedSeries(seriesName: string, teamNames: string[]): boolean {
  if (isMinorSeries(seriesName)) return false;
  const text = `${seriesName} ${teamNames.join(" ")}`.toLowerCase();
  if (isYouthOrWomen(text)) return false;
  if (FEATURED_SERIES_KEYWORDS.some((k) => text.includes(k))) return true;
  const seniorCount = teamNames.filter(isSeniorNationTeam).length;
  return seniorCount >= 1 && MAJOR_NATIONS.some((n) => text.includes(n));
}

export function computeTier(seriesName: string, teamNames: string[]): 1 | 2 | 3 {
  const series = seriesName.toLowerCase();
  const text = `${series} ${teamNames.join(" ").toLowerCase()}`;

  if (isMinorSeries(seriesName)) return 3;
  if (isYouthOrWomen(text)) return 2;

  if (FEATURED_SERIES_KEYWORDS.some((k) => series.includes(k))) {
    return 1;
  }

  const seniorTeams = teamNames.filter(isSeniorNationTeam);
  if (seniorTeams.length >= 2) return 1;
  if (seniorTeams.length === 1) return 1;

  if (teamNames.some(mentionsMajorNation)) return 2;
  return 3;
}

function normalizeHeaderEvent(
  event: RawHeaderEvent,
  leagueId: string,
  seriesName: string
): CricketMatch {
  const teams = (event.competitors ?? []).map(teamFromCompetitor);
  const state = mapState(event.fullStatus?.type?.state ?? event.status);
  const { format, matchLabel } = extractFormatMeta({
    title: event.title,
    description: event.description,
    classCard: event.class?.internationalClassCard ?? event.class?.generalClassCard,
  });

  return {
    id: String(event.id ?? ""),
    leagueId,
    series: seriesName,
    name: event.name ?? teams.map((t) => t.name).join(" v "),
    shortName: event.shortName ?? "",
    date: event.date ?? "",
    state,
    statusText:
      event.fullStatus?.type?.detail ??
      event.fullStatus?.type?.description ??
      event.summary ??
      "",
    note: event.note ?? "",
    venue: event.location ?? null,
    format,
    matchLabel,
    tier: computeTier(seriesName, teams.map((t) => t.name)),
    teams,
  };
}

function normalizeScoreboardEvent(
  event: RawScoreboardEvent,
  leagueId: string,
  seriesName: string
): CricketMatch {
  const comp = event.competitions?.[0];
  const teams = (comp?.competitors ?? []).map(teamFromCompetitor);
  const state = mapState(event.status?.type?.state);
  const { format, matchLabel } = extractFormatMeta({
    description: comp?.description,
    classCard: comp?.class?.internationalClassCard ?? comp?.class?.generalClassCard,
  });

  return {
    id: String(event.id ?? ""),
    leagueId,
    series: seriesName,
    name: event.name ?? teams.map((t) => t.name).join(" v "),
    shortName: event.shortName ?? "",
    date: event.date ?? "",
    state,
    statusText: event.status?.type?.detail ?? event.status?.type?.description ?? "",
    note: comp?.status?.summary ?? event.status?.summary ?? "",
    venue: comp?.venue?.fullName ?? null,
    format,
    matchLabel,
    tier: computeTier(seriesName, teams.map((t) => t.name)),
    teams,
  };
}

/* ------------------------------------------------------------------ */
/* Provider API                                                        */
/* ------------------------------------------------------------------ */

async function getHeaderSeries(): Promise<CricketSeries[]> {
  const data = await fetchJson<{
    sports?: Array<{ leagues?: RawHeaderLeague[] }>;
  }>(HEADER_URL);

  const leagues = data.sports?.[0]?.leagues ?? [];

  return leagues.map((league) => {
    const leagueId = String(league.id ?? "");
    const name = league.name ?? "Cricket";
    return {
      leagueId,
      name,
      matches: (league.events ?? []).map((e) =>
        normalizeHeaderEvent(e, leagueId, name)
      ),
    };
  });
}

function matchFromSummary(
  eventId: string,
  leagueId: string,
  data: RawSummary
): CricketMatch | null {
  const competition = data.header?.competitions?.[0];
  if (!competition) return null;

  const headerLeagueId = String(data.header?.league?.id ?? leagueId);
  if (headerLeagueId !== leagueId) return null;

  const seriesName = data.header?.league?.name ?? "Cricket";
  const teams = (competition.competitors ?? []).map(teamFromCompetitor);
  const state = mapState(competition.status?.type?.state);

  const { format, matchLabel } = extractFormatMeta({
    description: competition.description,
    classCard:
      competition.class?.internationalClassCard ?? competition.class?.generalClassCard,
  });

  return {
    id: eventId,
    leagueId,
    series: seriesName,
    name: teams.map((t) => t.name).join(" v "),
    shortName: teams.map((t) => t.abbreviation || t.name).join(" v "),
    date: competition.date ?? "",
    state,
    statusText:
      competition.status?.type?.detail ??
      competition.status?.type?.description ??
      "",
    note: competition.status?.summary ?? "",
    venue: data.gameInfo?.venue?.fullName ?? null,
    format,
    matchLabel,
    tier: computeTier(seriesName, teams.map((t) => t.name)),
    teams,
  };
}

async function fetchMatchFromSummary(
  leagueId: string,
  eventId: number
): Promise<CricketMatch | null> {
  const data = await fetchJsonOptional<RawSummary>(
    `${SUMMARY_BASE}/${leagueId}/summary?event=${eventId}`
  );
  if (!data) return null;
  return matchFromSummary(String(eventId), leagueId, data);
}

async function fetchScoreboardByDate(
  leagueId: string,
  date: string,
  seriesName: string
): Promise<CricketMatch[]> {
  const data = await fetchJsonOptional<{
    leagues?: Array<{ name?: string }>;
    events?: RawScoreboardEvent[];
  }>(`${SITE_BASE}/${leagueId}/scoreboard?dates=${date}`);

  if (!data) return [];

  const name = data.leagues?.[0]?.name ?? seriesName;
  return (data.events ?? [])
    .map((e) => normalizeScoreboardEvent(e, leagueId, name))
    .filter((m) => matchBelongsToSeries(m, name));
}

/** Load full tour schedule via lightweight date scoreboards (no summary probing). */
export async function getFullLeagueMatches(leagueId: string): Promise<CricketMatch[]> {
  const cacheKey = `${leagueId}:${LEAGUE_CACHE_VERSION}`;
  const cached = leagueMatchesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LEAGUE_MATCHES_CACHE_MS) {
    return cached.matches;
  }

  const scoreboard = await fetchJsonOptional<{
    leagues?: Array<{ name?: string }>;
    events?: RawScoreboardEvent[];
  }>(`${SITE_BASE}/${leagueId}/scoreboard`);

  if (!scoreboard) return [];

  const seriesName = scoreboard.leagues?.[0]?.name ?? "Cricket";
  const anchorDate = scoreboard.events?.[0]?.date
    ? new Date(scoreboard.events[0].date)
    : new Date();

  const byId = new Map<string, CricketMatch>();
  for (const event of scoreboard.events ?? []) {
    const match = normalizeScoreboardEvent(event, leagueId, seriesName);
    if (matchBelongsToSeries(match, seriesName)) byId.set(match.id, match);
  }

  const dates: string[] = [];
  const start = new Date(anchorDate);
  start.setDate(start.getDate() - 35);
  const end = new Date(anchorDate);
  end.setDate(end.getDate() + 25);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatEspnDate(d));
  }

  const CHUNK = 20;
  for (let i = 0; i < dates.length; i += CHUNK) {
    const chunk = dates.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((date) => fetchScoreboardByDate(leagueId, date, seriesName))
    );
    for (const matches of results) {
      for (const match of matches) byId.set(match.id, match);
    }
  }

  const matches = [...byId.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  leagueMatchesCache.set(cacheKey, { matches, at: Date.now() });
  return matches;
}

interface LeagueActivity {
  active: boolean;
  seriesName: string;
  anchorDate: Date;
}

/** Quick check: is this tour currently in progress or about to start? */
async function getLeagueActivity(leagueId: string): Promise<LeagueActivity | null> {
  const data = await fetchJsonOptional<{
    leagues?: Array<{ name?: string }>;
    events?: RawScoreboardEvent[];
  }>(`${SITE_BASE}/${leagueId}/scoreboard`);

  const event = data?.events?.[0];
  const seriesName = data?.leagues?.[0]?.name ?? "";
  if (!event?.date || !seriesName || seriesName === "504") return null;

  const teams = (event.competitions?.[0]?.competitors ?? []).map(
    (c) => c.displayName ?? c.team?.displayName ?? ""
  );
  if (!isSeniorFeaturedSeries(seriesName, teams)) return null;

  const anchorDate = new Date(event.date);
  const state = mapState(event.status?.type?.state);
  const daysFromNow = (anchorDate.getTime() - Date.now()) / 86_400_000;

  const active =
    state === "live" ||
    (state === "upcoming" && daysFromNow <= ACTIVE_FUTURE_DAYS) ||
    (state === "finished" && daysFromNow >= -ACTIVE_PAST_DAYS);

  return { active, seriesName, anchorDate };
}

export function isOngoingSeries(matches: CricketMatch[]): boolean {
  const now = Date.now();
  const hasLive = matches.some((m) => m.state === "live");
  const hasUpcomingSoon = matches.some((m) => {
    if (m.state !== "upcoming") return false;
    const days = (new Date(m.date).getTime() - now) / 86_400_000;
    return days <= ACTIVE_FUTURE_DAYS;
  });
  const hasRecentAndMore = matches.some((m) => {
    if (m.state !== "finished") return false;
    const days = (now - new Date(m.date).getTime()) / 86_400_000;
    return days <= ACTIVE_PAST_DAYS;
  }) && hasUpcomingSoon;

  return hasLive || hasUpcomingSoon || hasRecentAndMore;
}

/** Fast path: header live feed only (~1 HTTP request). */
export async function getFastLiveMatches(): Promise<CricketMatch[]> {
  const header = await getHeaderSeries();
  return header
    .flatMap((s) => s.matches)
    .filter((m) => m.state === "live" && m.tier <= 2);
}

/** Active senior tours for top nations — no discovery scan on the request path. */
export async function getActiveFeaturedSeries(): Promise<CricketSeries[]> {
  const headerSeries = await getHeaderSeries();

  const candidateIds = new Set<string>([
    ...PRIORITY_LEAGUE_IDS,
    ...headerSeries.map((s) => s.leagueId),
  ]);

  const activities = await Promise.all(
    [...candidateIds].map(async (id) => {
      const activity = await getLeagueActivity(id);
      return activity?.active ? id : null;
    })
  );

  const activeIds = [...new Set(activities.filter((id): id is string => id !== null))];

  const seriesList = await Promise.all(
    activeIds.map(async (leagueId) => {
      const matches = await getFullLeagueMatches(leagueId);
      if (matches.length === 0) return null;
      return {
        leagueId,
        name: matches[0]!.series,
        matches,
      } satisfies CricketSeries;
    })
  );

  const byLeague = new Map<string, CricketSeries>();
  for (const series of seriesList) {
    if (series && isOngoingSeries(series.matches)) {
      byLeague.set(series.leagueId, series);
    }
  }

  for (const header of headerSeries) {
    const teamNames = header.matches.flatMap((m) => m.teams.map((t) => t.name));
    if (!isSeniorFeaturedSeries(header.name, teamNames)) continue;

    const existing = byLeague.get(header.leagueId);
    if (!existing) {
      if (header.matches.some((m) => m.state === "live")) {
        byLeague.set(header.leagueId, header);
      }
      continue;
    }
    const merged = new Map(existing.matches.map((m) => [m.id, m]));
    for (const m of header.matches) merged.set(m.id, m);
    existing.matches = [...merged.values()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  return [...byLeague.values()];
}

async function probeLeagueId(id: number): Promise<string | null> {
  const data = await fetchJsonOptional<{
    leagues?: Array<{ name?: string }>;
    events?: RawScoreboardEvent[];
  }>(`${SITE_BASE}/${id}/scoreboard`);

  const name = data?.leagues?.[0]?.name ?? "";
  if (!name || name === "504") return null;
  if (isMinorSeries(name)) return null;

  const teams = (data?.events ?? []).flatMap((e) =>
    (e.competitions?.[0]?.competitors ?? []).map(
      (c) => c.displayName ?? c.team?.displayName ?? ""
    )
  );

  if (!isSeniorFeaturedSeries(name, teams)) return null;
  return String(id);
}

async function runDiscoveryScan(): Promise<string[]> {
  const ids: string[] = [];
  for (let start = LEAGUE_SCAN_MIN; start <= LEAGUE_SCAN_MAX; start += LEAGUE_SCAN_BATCH) {
    const batch = Array.from(
      { length: LEAGUE_SCAN_BATCH },
      (_, i) => start + i
    ).filter((id) => id <= LEAGUE_SCAN_MAX);

    const found = await Promise.all(batch.map((id) => probeLeagueId(id)));
    for (const leagueId of found) {
      if (leagueId) ids.push(leagueId);
    }
  }
  return [...new Set([...PRIORITY_LEAGUE_IDS, ...ids])];
}

/** Scan ESPN league IDs for active senior tours involving major nations. */
export async function discoverMajorNationLeagues(): Promise<string[]> {
  if (
    discoveredLeagueIdsCache &&
    Date.now() - discoveredLeagueIdsCache.at < DISCOVERY_CACHE_MS
  ) {
    return discoveredLeagueIdsCache.ids;
  }

  if (!discoveryInProgress) {
    discoveryInProgress = true;
    void runDiscoveryScan()
      .then((ids) => {
        discoveredLeagueIdsCache = { ids, at: Date.now() };
        console.log(`[Cricket] Discovery complete: ${ids.length} tour leagues`);
      })
      .finally(() => {
        discoveryInProgress = false;
      });
  }

  return discoveredLeagueIdsCache?.ids ?? [...PRIORITY_LEAGUE_IDS];
}

/** Warm priority tour caches in the background (no full ID scan). */
export function warmCricketLeagueDiscovery(): void {
  void (async () => {
    const series = await getActiveFeaturedSeries();
    console.log(
      `[Cricket] Warmed ${series.length} active tour caches (${series.map((s) => s.name).join(", ")})`
    );
  })().catch((err) => {
    console.warn("[Cricket] Cache warm-up failed:", (err as Error).message);
  });
}

async function peekLeagueInfo(
  leagueId: string
): Promise<{ name: string; teams: string[] } | null> {
  const data = await fetchJsonOptional<{
    leagues?: Array<{ name?: string }>;
    events?: RawScoreboardEvent[];
  }>(`${SITE_BASE}/${leagueId}/scoreboard`);

  if (!data) return null;

  const name = data.leagues?.[0]?.name ?? "";
  const teams = (data.events ?? []).flatMap((e) =>
    (e.competitions?.[0]?.competitors ?? []).map(
      (c) => c.displayName ?? c.team?.displayName ?? ""
    )
  );

  return { name, teams };
}

export async function getCurrentSeries(): Promise<CricketSeries[]> {
  return getActiveFeaturedSeries();
}

export async function getLeagueMatches(leagueId: string): Promise<CricketMatch[]> {
  try {
    return await getFullLeagueMatches(leagueId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) return [];
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Match details / scorecard                                           */
/* ------------------------------------------------------------------ */

interface RawStat {
  name?: string;
  value?: number;
  displayValue?: string;
}

interface RawOutDetails {
  shortText?: string;
  dismissalCard?: string;
  details?: { text?: string };
  bowler?: { displayName?: string };
}

interface RawBattingDetail {
  order?: number;
  outDetails?: RawOutDetails;
}

interface RawInnerLinescore {
  order?: number;
  statistics?: {
    categories?: Array<{ stats?: RawStat[] }>;
    batting?: RawBattingDetail;
  };
  batting?: RawBattingDetail;
}

interface RawPlayerPeriod {
  period?: number;
  linescores?: RawInnerLinescore[];
}

interface RawRosterEntry {
  athlete?: { displayName?: string; name?: string };
  linescores?: RawPlayerPeriod[];
}

interface RawRoster {
  homeAway?: string;
  team?: RawTeamRef;
  roster?: RawRosterEntry[];
}

interface RawSummary {
  header?: {
    id?: string;
    league?: { id?: number | string; name?: string };
    competitions?: Array<{
      id?: string;
      date?: string;
      description?: string;
      status?: {
        summary?: string;
        type?: { state?: string; description?: string; detail?: string };
      };
      competitors?: RawCompetitor[];
      class?: { generalClassCard?: string; internationalClassCard?: string };
    }>;
  };
  gameInfo?: { venue?: { fullName?: string } };
  rosters?: RawRoster[];
  notes?: Array<{ text?: string }>;
  leaders?: RawLeadersBlock[];
  article?: { story?: string; headline?: string };
}

interface RawLeaderAthlete {
  id?: string;
  displayName?: string;
  headshot?: { href?: string };
}

interface RawLeadersBlock {
  team?: { id?: string; displayName?: string; logo?: string };
  linescores?: Array<{
    period?: number;
    leaders?: Array<{
      name?: string;
      displayName?: string;
      leaders?: Array<{
        displayValue?: string;
        value?: string;
        athlete?: RawLeaderAthlete;
      }>;
    }>;
  }>;
}

function statsMap(inner: RawInnerLinescore): Map<string, RawStat> {
  const map = new Map<string, RawStat>();
  for (const category of inner.statistics?.categories ?? []) {
    for (const stat of category.stats ?? []) {
      if (stat.name) map.set(stat.name, stat);
    }
  }
  return map;
}

function statNum(map: Map<string, RawStat>, name: string): number {
  return Number(map.get(name)?.value ?? 0);
}

function statText(map: Map<string, RawStat>, name: string): string {
  return map.get(name)?.displayValue ?? "";
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&dagger;": "†",
    "&Dagger;": "‡",
  };

  let result = value;
  for (const [entity, char] of Object.entries(named)) {
    result = result.replaceAll(entity, char);
  }
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return result;
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  );
}

function cleanDismissalText(value: string): string {
  // † / ‡ are ESPN wicketkeeper markers — drop them for readable scorecards.
  return stripHtml(value).replace(/[†‡]/g, "").replace(/\s+/g, " ").trim();
}

function outDetailsOf(inner: RawInnerLinescore): RawOutDetails | undefined {
  return inner.statistics?.batting?.outDetails ?? inner.batting?.outDetails;
}

function battingStatus(
  inner: RawInnerLinescore,
  outs: number
): { dismissal: string; notOut: boolean } {
  const outDetails = outDetailsOf(inner);
  const short = cleanDismissalText(outDetails?.shortText?.trim() ?? "");
  const card = cleanDismissalText(
    typeof outDetails?.dismissalCard === "string" ? outDetails.dismissalCard : ""
  );
  const shortLower = short.toLowerCase();
  const cardLower = card.toLowerCase();

  if (outs > 0) {
    return { dismissal: dismissalText(inner, false), notOut: false };
  }

  if (shortLower.includes("retired hurt") || cardLower.includes("retired hurt")) {
    return { dismissal: short || "retired hurt", notOut: false };
  }

  if (shortLower === "retired out" || cardLower === "retired out") {
    return { dismissal: short || "retired out", notOut: false };
  }

  if (cardLower === "retired not out" && short && shortLower !== "not out") {
    return { dismissal: short, notOut: false };
  }

  if (short && shortLower !== "not out") {
    return { dismissal: short, notOut: false };
  }

  if (card && cardLower !== "not out" && cardLower !== "retired not out") {
    return { dismissal: card, notOut: false };
  }

  if (shortLower === "not out" || cardLower === "not out" || (!short && !card)) {
    return { dismissal: "not out", notOut: true };
  }

  return { dismissal: dismissalText(inner, false), notOut: false };
}

function dismissalText(inner: RawInnerLinescore, notOut: boolean): string {
  if (notOut) return "not out";

  const outDetails = outDetailsOf(inner);

  const short = outDetails?.shortText?.trim();
  if (short) return cleanDismissalText(short);

  const card =
    typeof outDetails?.dismissalCard === "string"
      ? outDetails.dismissalCard.trim()
      : "";
  if (card) return cleanDismissalText(card);

  const bowler = outDetails?.bowler?.displayName;
  if (bowler) return `b ${bowler}`;

  const long = outDetails?.details?.text?.trim();
  if (long) {
    const cleaned = cleanDismissalText(long);
    return cleaned.length > 90 ? `${cleaned.slice(0, 87)}…` : cleaned;
  }

  return "out";
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function findLeaderPhoto(
  data: RawSummary,
  playerName: string
): { photo: string; teamId: string; teamName: string; teamLogo: string } | null {
  const target = playerName.trim().toLowerCase();
  if (!target) return null;

  for (const block of data.leaders ?? []) {
    for (const ls of block.linescores ?? []) {
      for (const cat of ls.leaders ?? []) {
        for (const leader of cat.leaders ?? []) {
          const name = leader.athlete?.displayName?.trim();
          if (!name) continue;
          const lower = name.toLowerCase();
          if (lower === target || lower.includes(target) || target.includes(lower)) {
            return {
              photo: leader.athlete?.headshot?.href ?? "",
              teamId: String(block.team?.id ?? ""),
              teamName: block.team?.displayName ?? "",
              teamLogo: block.team?.logo ?? "",
            };
          }
        }
      }
    }
  }

  return null;
}

function extractPotmNameFromStory(story: string): string | null {
  const text = stripHtml(story);
  const patterns = [
    /player of the match[:\s-]+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i,
    /man of the match[:\s-]+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+(?:is|was)\s+(?:named\s+)?(?:the\s+)?player of the match/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+(?:is|was)\s+(?:named\s+)?(?:the\s+)?man of the match/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return null;
}

function extractPotmFromLeaders(data: RawSummary): CricketPlayerOfTheMatch | null {
  const candidates: Array<{
    name: string;
    photo: string;
    teamId: string;
    teamName: string;
    teamLogo: string;
    score: number;
    statLabel: string;
    statValue: string;
  }> = [];

  for (const block of data.leaders ?? []) {
    for (const ls of block.linescores ?? []) {
      for (const cat of ls.leaders ?? []) {
        for (const leader of cat.leaders ?? []) {
          const athlete = leader.athlete;
          const name = athlete?.displayName?.trim();
          if (!name) continue;

          const rawValue = leader.value ?? leader.displayValue ?? "0";
          const value = Number.parseFloat(String(rawValue).replace(/[^\d.]/g, "")) || 0;
          const category = (cat.name ?? cat.displayName ?? "").toLowerCase();
          let score = value;
          let statLabel = cat.displayName ?? cat.name ?? "Performance";

          if (category.includes("wicket")) {
            score = value * 25;
            statLabel = "Wickets";
          } else if (category.includes("run")) {
            statLabel = "Runs";
          }

          candidates.push({
            name,
            photo: athlete?.headshot?.href ?? "",
            teamId: String(block.team?.id ?? ""),
            teamName: block.team?.displayName ?? "",
            teamLogo: block.team?.logo ?? "",
            score,
            statLabel,
            statValue: leader.displayValue ?? String(value),
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;

  return {
    player: {
      id: "",
      name: best.name,
      photo: best.photo,
    },
    team: {
      id: best.teamId,
      name: best.teamName,
      logo: best.teamLogo,
    },
    statLabel: best.statLabel,
    statValue: best.statValue,
    provisional: true,
  };
}

function resolveCricketPlayerOfTheMatch(
  data: RawSummary,
  state: CricketMatchState
): CricketPlayerOfTheMatch | null {
  if (state === "upcoming") return null;

  const storyName = data.article?.story
    ? extractPotmNameFromStory(data.article.story)
    : null;

  if (storyName && state === "finished") {
    const leaderMeta = findLeaderPhoto(data, storyName);
    return {
      player: {
        id: leaderMeta ? "" : "",
        name: storyName,
        photo: leaderMeta?.photo ?? "",
      },
      team: {
        id: leaderMeta?.teamId ?? "",
        name: leaderMeta?.teamName ?? "",
        logo: leaderMeta?.teamLogo ?? "",
      },
      statLabel: "Player of the Match",
      statValue: "",
      provisional: false,
    };
  }

  const leaderPick = extractPotmFromLeaders(data);
  if (!leaderPick) return null;

  return {
    ...leaderPick,
    provisional: state === "live" ? true : leaderPick.provisional,
  };
}

export async function getMatchDetails(
  leagueId: string,
  eventId: string
): Promise<CricketMatchDetails> {
  const data = await fetchJson<RawSummary>(
    `${SUMMARY_BASE}/${leagueId}/summary?event=${eventId}`
  );

  const competition = data.header?.competitions?.[0];
  if (!competition) {
    return { match: null, innings: [] };
  }

  const seriesName = data.header?.league?.name ?? "Cricket";
  const teams = (competition.competitors ?? []).map(teamFromCompetitor);
  const state = mapState(competition.status?.type?.state);

  const { format, matchLabel } = extractFormatMeta({
    description: competition.description,
    classCard:
      competition.class?.internationalClassCard ?? competition.class?.generalClassCard,
  });

  const match: CricketMatch = {
    id: eventId,
    leagueId,
    series: seriesName,
    name: teams.map((t) => t.name).join(" v "),
    shortName: teams.map((t) => t.abbreviation || t.name).join(" v "),
    date: competition.date ?? "",
    state,
    statusText:
      competition.status?.type?.detail ??
      competition.status?.type?.description ??
      "",
    note: competition.status?.summary ?? "",
    venue: data.gameInfo?.venue?.fullName ?? null,
    format,
    matchLabel,
    tier: computeTier(seriesName, teams.map((t) => t.name)),
    teams,
  };

  const innings = buildInnings(competition.competitors ?? [], data.rosters ?? []);
  const playerOfTheMatch = resolveCricketPlayerOfTheMatch(data, state);

  return { match, innings, playerOfTheMatch };
}

function buildInnings(
  competitors: RawCompetitor[],
  rosters: RawRoster[]
): CricketInnings[] {
  // Collect batting periods per competitor: linescore entries with isBatting=true.
  interface PeriodInfo {
    period: number;
    battingCompetitor: RawCompetitor;
    line: RawCompetitorLinescore;
  }

  const periods: PeriodInfo[] = [];
  for (const competitor of competitors) {
    for (const line of competitor.linescores ?? []) {
      if (line.isBatting && typeof line.period === "number") {
        periods.push({ period: line.period, battingCompetitor: competitor, line });
      }
    }
  }
  periods.sort((a, b) => a.period - b.period);

  const battingCountByTeam = new Map<string, number>();

  return periods
    .map((info) => {
      const battingName =
        info.battingCompetitor.displayName ??
        info.battingCompetitor.team?.displayName ??
        "Batting";
      const bowlingCompetitor = competitors.find((c) => c !== info.battingCompetitor);
      const bowlingName =
        bowlingCompetitor?.displayName ??
        bowlingCompetitor?.team?.displayName ??
        "Bowling";

      const count = (battingCountByTeam.get(battingName) ?? 0) + 1;
      battingCountByTeam.set(battingName, count);

      const battingRosterTeam = rosterForTeam(rosters, info.battingCompetitor);
      const bowlingRosterTeam = bowlingCompetitor
        ? rosterForTeam(rosters, bowlingCompetitor)
        : undefined;

      const batting = battingCard(battingRosterTeam, info.period);
      const bowling = bowlingCard(bowlingRosterTeam, info.period);

      const totalInningsForTeam = periods.filter(
        (p) => p.battingCompetitor === info.battingCompetitor
      ).length;

      const title =
        totalInningsForTeam > 1
          ? `${battingName} ${ordinal(count)} Innings`
          : `${battingName} Innings`;

      return {
        title,
        battingTeam: battingName,
        bowlingTeam: bowlingName,
        score:
          info.line.score ??
          `${info.line.runs ?? 0}/${info.line.wickets ?? 0}`,
        runs: info.line.runs ?? 0,
        wickets: info.line.wickets ?? 0,
        overs: String(info.line.overs ?? ""),
        target: info.line.target || null,
        batting,
        bowling,
      };
    })
    .filter((innings) => innings.batting.length > 0 || innings.runs > 0);
}

function rosterForTeam(
  rosters: RawRoster[],
  competitor: RawCompetitor
): RawRoster | undefined {
  const name = (
    competitor.displayName ??
    competitor.team?.displayName ??
    ""
  ).toLowerCase();

  return rosters.find(
    (r) => (r.team?.displayName ?? r.team?.name ?? "").toLowerCase() === name
  );
}

function playerPeriod(
  entry: RawRosterEntry,
  period: number
): RawInnerLinescore | undefined {
  const p = (entry.linescores ?? []).find((ls) => ls.period === period);
  return p?.linescores?.[0];
}

function battingCard(
  roster: RawRoster | undefined,
  period: number
): CricketBattingLine[] {
  if (!roster) return [];

  const lines: CricketBattingLine[] = [];
  for (const entry of roster.roster ?? []) {
    const inner = playerPeriod(entry, period);
    if (!inner) continue;

    const stats = statsMap(inner);
    if (statNum(stats, "batted") !== 1) continue;

    const outs = statNum(stats, "outs");
    const status = battingStatus(inner, outs);

    lines.push({
      name: entry.athlete?.displayName ?? entry.athlete?.name ?? "Unknown",
      dismissal: status.dismissal,
      runs: statNum(stats, "runs"),
      balls: statNum(stats, "ballsFaced"),
      fours: statNum(stats, "fours"),
      sixes: statNum(stats, "sixes"),
      strikeRate: statText(stats, "strikeRate") || "-",
      notOut: status.notOut,
      order:
        statNum(stats, "battingPosition") ||
        inner.statistics?.batting?.order ||
        inner.order ||
        99,
    });
  }

  return lines.sort((a, b) => a.order - b.order);
}

function bowlingCard(
  roster: RawRoster | undefined,
  period: number
): CricketBowlingLine[] {
  if (!roster) return [];

  const lines: CricketBowlingLine[] = [];
  for (const entry of roster.roster ?? []) {
    const inner = playerPeriod(entry, period);
    if (!inner) continue;

    const stats = statsMap(inner);
    const ballsBowled = statNum(stats, "balls");
    const oversText = statText(stats, "overs");
    if (ballsBowled <= 0 && (oversText === "" || oversText === "0")) continue;

    lines.push({
      name: entry.athlete?.displayName ?? entry.athlete?.name ?? "Unknown",
      overs: oversText || "0",
      maidens: statNum(stats, "maidens"),
      conceded: statNum(stats, "conceded"),
      wickets: statNum(stats, "wickets"),
      economy: statText(stats, "economyRate") || "-",
      order: statNum(stats, "bowlingPosition") || 99,
    });
  }

  return lines.sort((a, b) => a.order - b.order);
}
