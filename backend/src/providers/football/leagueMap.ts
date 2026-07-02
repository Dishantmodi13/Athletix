/** API-Football league id for the FIFA World Cup. */
export const WORLD_CUP_LEAGUE_ID = 1;

/**
 * Maps API-Football league IDs → football-data.org competition IDs.
 * @see https://docs.football-data.org/general/v4/competition.html
 */
export const API_FOOTBALL_TO_FOOTBALL_DATA: Record<number, number> = {
  39: 2021, // Premier League
  140: 2014, // La Liga
  135: 2019, // Serie A
  78: 2002, // Bundesliga
  61: 2015, // Ligue 1
  2: 2001, // Champions League
  3: 2146, // Europa League
  1: 2000, // World Cup
};

export function toFootballDataCompetition(apiFootballLeagueId: number): number | null {
  return API_FOOTBALL_TO_FOOTBALL_DATA[apiFootballLeagueId] ?? null;
}

/** Reverse lookup: football-data competition → API-Football league id for UI consistency. */
export function toApiFootballLeague(footballDataCompetitionId: number): number {
  const entry = Object.entries(API_FOOTBALL_TO_FOOTBALL_DATA).find(
    ([, fd]) => fd === footballDataCompetitionId
  );
  return entry ? Number(entry[0]) : footballDataCompetitionId;
}
