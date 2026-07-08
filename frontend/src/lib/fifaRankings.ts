/** FIFA men's world rankings (approx. early 2026) keyed by normalized team name. */
const FIFA_RANKINGS: Record<string, number> = {
  argentina: 1,
  france: 2,
  spain: 3,
  england: 4,
  brazil: 5,
  portugal: 6,
  netherlands: 7,
  italy: 8,
  belgium: 9,
  germany: 10,
  uruguay: 11,
  colombia: 12,
  mexico: 13,
  usa: 14,
  "united states": 14,
  senegal: 15,
  japan: 16,
  morocco: 17,
  switzerland: 18,
  iran: 19,
  denmark: 20,
  "korea republic": 21,
  "south korea": 21,
  australia: 22,
  ukraine: 23,
  turkey: 24,
  ecuador: 25,
  austria: 26,
  canada: 27,
  norway: 28,
  panama: 29,
  poland: 30,
  egypt: 31,
  sweden: 32,
  hungary: 33,
  "cote d'ivoire": 34,
  "ivory coast": 34,
  scotland: 35,
  chile: 36,
  croatia: 37,
  paraguay: 38,
  serbia: 39,
  nigeria: 40,
  tunisia: 41,
  algeria: 42,
  "czech republic": 43,
  cameroon: 44,
  "costa rica": 45,
  peru: 46,
  qatar: 47,
  romania: 48,
  venezuela: 49,
  russia: 50,
  wales: 51,
  slovakia: 52,
  greece: 53,
  bolivia: 54,
  ireland: 55,
  "republic of ireland": 55,
  slovenia: 56,
  jordan: 57,
  uzbekistan: 58,
  "saudi arabia": 59,
  ghana: 60,
  "south africa": 61,
  iraq: 62,
  "new zealand": 63,
  honduras: 64,
  "north macedonia": 65,
  "cape verde": 66,
  jamaica: 67,
  albania: 68,
  "northern ireland": 69,
  "united arab emirates": 70,
  china: 71,
  "bosnia and herzegovina": 72,
  israel: 73,
  georgia: 74,
  iceland: 75,
  finland: 76,
  haiti: 77,
  oman: 78,
  montenegro: 79,
  "curacao": 80,
};

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|sc|cf|afc)\b/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFifaRank(teamName: string): number | null {
  const key = normalizeTeamName(teamName);
  if (FIFA_RANKINGS[key] !== undefined) return FIFA_RANKINGS[key];

  const partial = Object.entries(FIFA_RANKINGS).find(
    ([name]) => key.includes(name) || name.includes(key)
  );
  return partial ? partial[1] : null;
}

export function isInternationalMatch(leagueId: number, leagueName?: string): boolean {
  if (leagueId === 1) return true;
  const n = (leagueName ?? "").toLowerCase();
  return n.includes("world cup") || n.includes("euro") || n.includes("nations");
}
