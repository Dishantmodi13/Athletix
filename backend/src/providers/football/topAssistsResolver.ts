import { apiFootballProvider } from "./apiFootball.provider";
import { footballDataProvider } from "./footballData.provider";
import { fotmobProvider } from "./fotmob.provider";
import { toFootballDataCompetition } from "./leagueMap";
import type { TopScorer } from "./football.types";

/** API-Football free tier only includes dedicated top-assists for seasons up to 2024. */
const API_FOOTBALL_TOP_ASSISTS_MAX_SEASON = 2024;

/**
 * Load top assists for the exact requested season.
 * 1) FotMob league stats — free, current-season assists for major leagues
 * 2) Goal-by-goal totals from football-data when deep match data is available
 * 3) API-Football players/topassists — only when that season is on the free plan
 */
export async function loadTopAssists(
  league: number,
  season: number
): Promise<TopScorer[]> {
  if (fotmobProvider.isAvailable()) {
    const fromFotmob = await fotmobProvider.getTopAssists(league, season);
    if (fromFotmob.length > 0) {
      return fromFotmob;
    }
  }

  const fdCompetition = toFootballDataCompetition(league);
  if (footballDataProvider.isAvailable() && fdCompetition) {
    const fromEvents = await footballDataProvider.getTopAssistsFromMatchGoals(
      league,
      season
    );
    if (fromEvents.length > 0) {
      return fromEvents;
    }
  }

  if (
    season <= API_FOOTBALL_TOP_ASSISTS_MAX_SEASON &&
    apiFootballProvider.isAvailable()
  ) {
    const fromApi = await apiFootballProvider.getTopAssists(league, season);
    if (fromApi.length > 0) {
      return fromApi;
    }
  }

  return [];
}
