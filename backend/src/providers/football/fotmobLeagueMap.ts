import { WORLD_CUP_LEAGUE_ID } from "./leagueMap";

/** API-Football league id → FotMob league id. */
export const API_FOOTBALL_TO_FOTMOB: Record<number, number> = {
  39: 47, // Premier League
  140: 87, // La Liga
  135: 55, // Serie A
  78: 54, // Bundesliga
  61: 53, // Ligue 1
  2: 42, // Champions League
  3: 73, // Europa League
  [WORLD_CUP_LEAGUE_ID]: 77, // World Cup
};

export function toFotmobLeague(apiFootballLeagueId: number): number | null {
  return API_FOOTBALL_TO_FOTMOB[apiFootballLeagueId] ?? null;
}

/** FotMob season query value for a league + API-Football season year. */
export function fotmobSeasonParam(apiFootballLeagueId: number, season: number): string {
  if (apiFootballLeagueId === WORLD_CUP_LEAGUE_ID) {
    return String(season);
  }
  return `${season}/${season + 1}`;
}
