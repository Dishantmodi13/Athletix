import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { cache } from "../../services/cache.service";
import { ApiKeyPool, isRateLimitError, parseKeyList } from "./apiKeyPool";
import { toApiFootballLeague, toFootballDataCompetition, WORLD_CUP_LEAGUE_ID } from "./leagueMap";
import { footballDataThrottle } from "./requestThrottle";
import type {
  FootballProvider,
  MatchDetailsResult,
  NormalizedMatch,
  SearchResult,
  StandingGroup,
  TopScorer,
} from "./football.types";
import { toStandingGroups, pickStandingsEntries, buildGroupStandingsFromMatches, needsWorldCupGroupSplit, type GroupStageMatch } from "./standingsUtils";
import { pickLeagueFixtures, type FixtureRange } from "./fixturesUtils";
import { buildKnockoutBracket, type KnockoutBracketData } from "./knockoutUtils";
import {
  eventsFromApiFootball,
  eventsFromFootballData,
  scoreSummaryFromFootballData,
  type FootballDataMatchExtras,
} from "./matchEventsUtils";
import {
  collectNationalTeamIds,
  filterTournamentScorers,
  sortTopAssists,
  sortTopScorers,
} from "./worldCupStats";

const BASE_URL = "https://api.football-data.org/v4";

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface FdMatchTeam {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  matchday?: number | null;
  venue?: string | null;
  group?: string | null;
  stage?: string | null;
  homeTeam: FdMatchTeam;
  awayTeam: FdMatchTeam;
  score: {
    winner?: string | null;
    duration?: string | null;
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
  goals?: FootballDataMatchExtras["goals"];
  bookings?: FootballDataMatchExtras["bookings"];
  substitutions?: FootballDataMatchExtras["substitutions"];
  competition?: {
    id: number;
    name: string;
    emblem?: string;
    area?: { name: string };
  };
}

function mapStatus(status: string, minute?: number | null) {
  const map: Record<string, { short: string; long: string }> = {
    LIVE: { short: "LIVE", long: "Live" },
    IN_PLAY: { short: "1H", long: "In Play" },
    PAUSED: { short: "HT", long: "Half Time" },
    FINISHED: { short: "FT", long: "Full Time" },
    SCHEDULED: { short: "NS", long: "Not Started" },
    TIMED: { short: "NS", long: "Scheduled" },
    POSTPONED: { short: "PST", long: "Postponed" },
    SUSPENDED: { short: "SUSP", long: "Suspended" },
    CANCELLED: { short: "CANC", long: "Cancelled" },
  };
  const mapped = map[status] ?? { short: status, long: status };
  return { ...mapped, elapsed: minute ?? null };
}

function winnerFlag(winner: string | null | undefined, side: "home" | "away"): boolean | null {
  if (!winner) return null;
  if (winner === "DRAW") return null;
  return winner === (side === "home" ? "HOME_TEAM" : "AWAY_TEAM");
}

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  FINAL: "Final",
  THIRD_PLACE: "Bronze Final",
};

function normalizeFdMatch(raw: FdMatch): NormalizedMatch {
  const leagueId = raw.competition
    ? toApiFootballLeague(raw.competition.id)
    : 0;

  return {
    id: raw.id,
    date: raw.utcDate,
    timestamp: Math.floor(new Date(raw.utcDate).getTime() / 1000),
    status: mapStatus(raw.status, raw.minute),
    league: {
      id: leagueId,
      name: raw.competition?.name ?? "Competition",
      logo: raw.competition?.emblem ?? "",
      country: raw.competition?.area?.name ?? "",
      round: raw.stage
        ? (STAGE_LABELS[raw.stage] ?? raw.stage)
        : raw.matchday
          ? `Matchday ${raw.matchday}`
          : "",
    },
    venue: { name: raw.venue ?? null, city: null },
    teams: {
      home: {
        id: raw.homeTeam.id ?? 0,
        name: raw.homeTeam.name?.trim() || "TBD",
        logo: raw.homeTeam.crest ?? "",
        shortName: raw.homeTeam.tla ?? raw.homeTeam.shortName ?? undefined,
        winner: winnerFlag(raw.score?.winner, "home"),
      },
      away: {
        id: raw.awayTeam.id ?? 0,
        name: raw.awayTeam.name?.trim() || "TBD",
        logo: raw.awayTeam.crest ?? "",
        shortName: raw.awayTeam.tla ?? raw.awayTeam.shortName ?? undefined,
        winner: winnerFlag(raw.score?.winner, "away"),
      },
    },
    goals: {
      home:
        raw.score?.duration === "PENALTY_SHOOTOUT" && raw.score?.regularTime
          ? (raw.score.regularTime.home ?? null)
          : (raw.score?.fullTime?.home ?? null),
      away:
        raw.score?.duration === "PENALTY_SHOOTOUT" && raw.score?.regularTime
          ? (raw.score.regularTime.away ?? null)
          : (raw.score?.fullTime?.away ?? null),
    },
    stage: raw.stage ?? null,
    matchday: raw.matchday ?? null,
    source: "football-data",
  };
}

export class FootballDataProvider implements FootballProvider {
  readonly name = "football-data";
  private readonly keyPool: ApiKeyPool;

  constructor() {
    this.keyPool = new ApiKeyPool(parseKeyList(env.footballDataApiKeys));
  }

  isAvailable(): boolean {
    return this.keyPool.hasKeys();
  }

  private async requestMatch<T>(path: string, ttlSeconds = 120): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const cacheKey = `fd:detail:${url}`;

    return cache.wrap<T>(cacheKey, ttlSeconds, () =>
      footballDataThrottle.schedule(() =>
        this.keyPool.execute(async (apiKey) => {
          let res: Response;
          try {
            res = await fetch(url, {
              headers: {
                "X-Auth-Token": apiKey,
                "X-Unfold-Goals": "true",
                "X-Unfold-Bookings": "true",
                "X-Unfold-Subs": "true",
              },
            });
          } catch {
            throw new AppError("Unable to reach football-data.org", 502);
          }

          if (res.status === 429) {
            throw new AppError("football-data.org rate limit reached", 429);
          }

          if (res.status === 403) {
            throw new AppError("football-data.org access forbidden or quota exceeded", 403);
          }

          if (!res.ok) {
            throw new AppError(`football-data.org HTTP ${res.status}`, res.status);
          }

          return (await res.json()) as T;
        }, isRateLimitError)
      )
    );
  }

  private async request<T>(path: string, ttlSeconds = 120): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const cacheKey = `fd:${url}`;

    return cache.wrap<T>(cacheKey, ttlSeconds, () =>
      footballDataThrottle.schedule(() =>
        this.keyPool.execute(async (apiKey) => {
          let res: Response;
          try {
            res = await fetch(url, {
              headers: { "X-Auth-Token": apiKey },
            });
          } catch {
            throw new AppError("Unable to reach football-data.org", 502);
          }

          if (res.status === 429) {
            throw new AppError("football-data.org rate limit reached", 429);
          }

          if (res.status === 403) {
            throw new AppError("football-data.org access forbidden or quota exceeded", 403);
          }

          if (!res.ok) {
            throw new AppError(`football-data.org HTTP ${res.status}`, res.status);
          }

          return (await res.json()) as T;
        }, isRateLimitError)
      )
    );
  }

  private competitionPath(league: number): string | null {
    const compId = toFootballDataCompetition(league);
    return compId ? `/competitions/${compId}` : null;
  }

  async getLiveMatches(): Promise<NormalizedMatch[]> {
    const data = await this.request<{ matches: FdMatch[] }>("/matches?status=LIVE,IN_PLAY,PAUSED", 25);
    return (data.matches ?? []).map(normalizeFdMatch);
  }

  async getFixturesByDate(date: string): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<{ matches: FdMatch[] }>(
        `/matches?dateFrom=${date}&dateTo=${date}`,
        120
      );
      return (data.matches ?? []).map(normalizeFdMatch);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      return [];
    }
  }

  private async fetchCompetitionMatches(
    league: number,
    season: number,
    cacheSeconds = 120
  ): Promise<NormalizedMatch[]> {
    const base = this.competitionPath(league);
    if (!base) return [];

    const data = await this.request<{ matches: FdMatch[] }>(
      `${base}/matches?season=${season}`,
      cacheSeconds
    );
    return (data.matches ?? []).map(normalizeFdMatch);
  }

  async getFixturesByLeague(
    league: number,
    season: number,
    limit = 10,
    range: FixtureRange = "mixed"
  ): Promise<NormalizedMatch[]> {
    try {
      const normalized = await this.fetchCompetitionMatches(league, season);
      return pickLeagueFixtures(normalized, limit, range);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      return [];
    }
  }

  async getKnockoutBracket(league: number, season: number): Promise<KnockoutBracketData | null> {
    if (league !== WORLD_CUP_LEAGUE_ID) return null;

    try {
      const matches = await this.fetchCompetitionMatches(league, season, 600);
      return buildKnockoutBracket(matches);
    } catch (error) {
      if (error instanceof AppError && isRateLimitError(error)) throw error;
      return null;
    }
  }

  async getStandings(league: number, season: number): Promise<StandingGroup[]> {
    const base = this.competitionPath(league);
    if (!base) return [];

    const data = await this.request<{
      standings: Array<{
        stage?: string;
        group?: string | null;
        type?: string;
        table: Array<{
          position: number;
          team: FdTeam;
          playedGames: number;
          won: number;
          draw: number;
          lost: number;
          goalsFor: number;
          goalsAgainst: number;
          goalDifference: number;
          points: number;
          form?: string;
        }>;
      }>;
    }>(`${base}/standings?season=${season}`, 600);

    const raw = data.standings ?? [];

    if (needsWorldCupGroupSplit(league, raw)) {
      const matchData = await this.request<{ matches: FdMatch[] }>(
        `${base}/matches?season=${season}`,
        600
      );
      return buildGroupStandingsFromMatches((matchData.matches ?? []) as GroupStageMatch[]);
    }

    const source = pickStandingsEntries(raw);

    return toStandingGroups(
      source.map((standing) => ({
        name: standing.group ?? standing.stage,
        rows: (standing.table ?? []).map((row) => ({
          rank: row.position,
          team: { id: row.team.id, name: row.team.name, logo: row.team.crest ?? "" },
          points: row.points,
          goalsDiff: row.goalDifference,
          all: {
            played: row.playedGames,
            win: row.won,
            draw: row.draw,
            lose: row.lost,
            goals: { for: row.goalsFor, against: row.goalsAgainst },
          },
          form: row.form ?? "",
        })),
      }))
    );
  }

  private async fetchWorldCupNationalTeamIds(season: number): Promise<Set<number>> {
    const base = this.competitionPath(WORLD_CUP_LEAGUE_ID);
    if (!base) return new Set();

    try {
      const data = await this.request<{ matches: FdMatch[] }>(
        `${base}/matches?season=${season}`,
        600
      );
      return collectNationalTeamIds((data.matches ?? []) as Parameters<typeof collectNationalTeamIds>[0]);
    } catch {
      return new Set();
    }
  }

  private async fetchTournamentScorers(
    league: number,
    season: number,
    limit = 500
  ): Promise<
    Array<{
      player: { id: number; name: string; nationality?: string };
      team: FdTeam;
      goals: number;
      assists?: number | null;
      playedMatches?: number;
    }>
  > {
    const raw = await this.fetchCompetitionScorers(league, season, limit);

    if (league !== WORLD_CUP_LEAGUE_ID) return raw;

    const nationalTeamIds = await this.fetchWorldCupNationalTeamIds(season);
    return filterTournamentScorers(raw, nationalTeamIds);
  }

  private async fetchCompetitionScorers(
    league: number,
    season: number,
    limit?: number
  ): Promise<
    Array<{
      player: { id: number; name: string; nationality?: string };
      team: FdTeam;
      goals: number;
      assists?: number | null;
      playedMatches?: number;
    }>
  > {
    const base = this.competitionPath(league);
    if (!base) return [];

    const query = limit ? `?season=${season}&limit=${limit}` : `?season=${season}`;
    const data = await this.request<{
      scorers: Array<{
        player: { id: number; name: string; nationality?: string };
        team: FdTeam;
        goals: number;
        assists?: number | null;
        playedMatches?: number;
      }>;
    }>(`${base}/scorers${query}`, 600);

    return data.scorers ?? [];
  }

  private mapScorerRow(s: {
    player: { id: number; name: string; nationality?: string };
    team: FdTeam;
    goals: number;
    assists?: number | null;
    playedMatches?: number;
  }): TopScorer {
    return {
      player: {
        id: s.player.id,
        name: s.player.name,
        photo: "",
        nationality: s.player.nationality ?? "",
      },
      statistics: [
        {
          team: { id: s.team.id, name: s.team.name, logo: s.team.crest ?? "" },
          games: { appearences: s.playedMatches ?? null },
          goals: { total: s.goals, assists: s.assists ?? null },
        },
      ],
    };
  }

  async getTopScorers(league: number, season: number): Promise<TopScorer[]> {
    if (league === WORLD_CUP_LEAGUE_ID) {
      const scorers = await this.fetchTournamentScorers(league, season, 500);
      return sortTopScorers(scorers.map((s) => this.mapScorerRow(s)));
    }

    const scorers = await this.fetchCompetitionScorers(league, season);
    return sortTopScorers(scorers.map((s) => this.mapScorerRow(s)));
  }

  async getTopAssists(league: number, season: number): Promise<TopScorer[]> {
    const scorers =
      league === WORLD_CUP_LEAGUE_ID
        ? await this.fetchTournamentScorers(league, season, 500)
        : await this.fetchCompetitionScorers(league, season, 500);
    return sortTopAssists(scorers.map((s) => this.mapScorerRow(s)));
  }

  async getMatchDetails(id: number): Promise<MatchDetailsResult> {
    const raw = await this.requestMatch<FdMatch>(`/matches/${id}`, 30);
    const match = normalizeFdMatch(raw);
    const extras: FootballDataMatchExtras = {
      goals: raw.goals,
      bookings: raw.bookings,
      substitutions: raw.substitutions,
      score: raw.score,
    };

    return {
      match,
      statistics: [],
      events: eventsFromFootballData(extras, match),
      lineups: [],
      scoreSummary: scoreSummaryFromFootballData(extras),
    };
  }

  async getTeam(id: number): Promise<unknown> {
    const data = await this.request<{
      id: number;
      name: string;
      crest?: string;
      venue?: string;
      address?: string;
      founded?: number;
      area?: { name: string };
    }>(`/teams/${id}`, 86400);

    return {
      team: {
        id: data.id,
        name: data.name,
        logo: data.crest ?? "",
        country: data.area?.name ?? "",
        founded: data.founded,
      },
      venue: { name: data.venue ?? null, city: data.address ?? null, capacity: null },
    };
  }

  async getTeamFixtures(team: number, _season: number): Promise<NormalizedMatch[]> {
    try {
      const data = await this.request<{ matches: FdMatch[] }>(`/teams/${team}/matches?limit=10`, 300);
      return (data.matches ?? []).map(normalizeFdMatch);
    } catch {
      return [];
    }
  }

  async getPlayer(_id: number, _season: number): Promise<unknown> {
    return null;
  }

  async search(query: string): Promise<SearchResult> {
    try {
      const data = await this.request<{ teams: FdTeam[] }>(
        `/teams?name=${encodeURIComponent(query)}`,
        600
      );
      return {
        teams: (data.teams ?? []).map((t) => ({ team: { id: t.id, name: t.name, logo: t.crest } })),
        players: [],
      };
    } catch {
      return { teams: [], players: [] };
    }
  }
}

export const footballDataProvider = new FootballDataProvider();
