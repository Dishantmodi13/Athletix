import { cache } from "../../services/cache.service";
import { fotmobSeasonParam, toFotmobLeague } from "./fotmobLeagueMap";
import type { TopScorer } from "./football.types";
import { sortTopAssists } from "./worldCupStats";

const BASE_URL = "https://www.fotmob.com/api/data";
const USER_AGENT = "Athletix/1.0 (football stats)";

interface FotmobStatRow {
  ParticiantId?: number;
  ParticipantName?: string;
  ParticipantCountryCode?: string;
  TeamId?: number;
  TeamName?: string;
  StatValue?: number;
  MatchesPlayed?: number | null;
}

interface FotmobPlayerStatBlock {
  name?: string;
  fetchAllUrl?: string;
  topThree?: Array<{
    id?: number;
    name?: string;
    ccode?: string;
    teamId?: number;
    teamName?: string;
    value?: number;
    stat?: { value?: number };
  }>;
}

interface FotmobLeagueStatsResponse {
  stats?: {
    players?: FotmobPlayerStatBlock[] | null;
  };
}

function teamLogoUrl(teamId: number): string {
  return `https://images.fotmob.com/image/upload/q_auto,t_team_icon_rev/s_256/${teamId}.webp`;
}

function mapFotmobRow(row: FotmobStatRow): TopScorer | null {
  const name = row.ParticipantName?.trim();
  const assists = row.StatValue ?? 0;
  if (!name || assists <= 0) return null;

  const teamId = row.TeamId ?? 0;
  return {
    player: {
      id: row.ParticiantId ?? 0,
      name,
      photo: "",
      nationality: row.ParticipantCountryCode ?? "",
    },
    statistics: [
      {
        team: {
          id: teamId,
          name: row.TeamName ?? "Team",
          logo: teamId > 0 ? teamLogoUrl(teamId) : "",
        },
        games: { appearences: row.MatchesPlayed ?? null },
        goals: { total: null, assists },
      },
    ],
  };
}

function mapTopThree(block: FotmobPlayerStatBlock): TopScorer[] {
  return (block.topThree ?? [])
    .map((row) =>
      mapFotmobRow({
        ParticiantId: row.id,
        ParticipantName: row.name,
        ParticipantCountryCode: row.ccode,
        TeamId: row.teamId,
        TeamName: row.teamName,
        StatValue: row.stat?.value ?? row.value,
        MatchesPlayed: null,
      })
    )
    .filter((row): row is TopScorer => row !== null);
}

async function fotmobFetch<T>(url: string, ttlSeconds: number): Promise<T> {
  const cacheKey = `fotmob:${url}`;
  return cache.wrap<T>(cacheKey, ttlSeconds, async () => {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`FotMob HTTP ${res.status} for ${url}`);
    }

    return (await res.json()) as T;
  });
}

export class FotmobProvider {
  readonly name = "fotmob";

  isAvailable(): boolean {
    return true;
  }

  async getTopAssists(league: number, season: number): Promise<TopScorer[]> {
    const fotmobLeagueId = toFotmobLeague(league);
    if (!fotmobLeagueId) return [];

    const seasonParam = fotmobSeasonParam(league, season);
    const statsUrl = `${BASE_URL}/leagues?id=${fotmobLeagueId}&tab=stats&season=${encodeURIComponent(seasonParam)}`;

    try {
      const page = await fotmobFetch<FotmobLeagueStatsResponse>(statsUrl, 3600);
      const players = page.stats?.players;
      if (!Array.isArray(players)) return [];

      const assistsBlock = players.find((block) => block.name === "goal_assist");
      if (!assistsBlock) return [];

      if (assistsBlock.fetchAllUrl) {
        const full = await fotmobFetch<{ TopLists?: Array<{ StatList?: FotmobStatRow[] }> }>(
          assistsBlock.fetchAllUrl,
          3600
        );
        const rows = full.TopLists?.[0]?.StatList ?? [];
        const normalized = rows
          .map((row) => mapFotmobRow(row))
          .filter((row): row is TopScorer => row !== null);
        if (normalized.length > 0) return sortTopAssists(normalized);
      }

      const fallback = mapTopThree(assistsBlock);
      return sortTopAssists(fallback);
    } catch (error) {
      console.warn(`[FotMob] getTopAssists failed for league ${league}:`, (error as Error).message);
      return [];
    }
  }
}

export const fotmobProvider = new FotmobProvider();
