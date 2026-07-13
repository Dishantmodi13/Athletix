export interface NormalizedPlayerProfile {
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
  /** Current club from TheSportsDB (separate from national-team tournament stats). */
  club?: { name: string; logo: string };
  source?: string;
}
