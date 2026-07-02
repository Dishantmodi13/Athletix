import type { Sport } from "@/types/onboarding";

export interface SportOption {
  id: Sport;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  accent: string;
}

export interface CompetitionOption {
  id: string;
  name: string;
  sport: Sport;
  region: string;
  gradient: string;
}

export interface TeamOption {
  id: string;
  name: string;
  sport: Sport;
  competitionIds: string[];
  shortName: string;
  color: string;
  emoji: string;
}

export interface PlayerOption {
  id: string;
  name: string;
  teamId: string;
  position: string;
  sport: Sport;
  gradient: string;
}

export interface PreferenceOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export const SPORTS: SportOption[] = [
  {
    id: "football",
    name: "Football",
    emoji: "⚽",
    description: "Follow leagues, clubs, and the world's greatest players.",
    gradient: "from-emerald-900/80 via-green-950/60 to-black",
    accent: "#22c55e",
  },
  {
    id: "cricket",
    name: "Cricket",
    emoji: "🏏",
    description: "Track tournaments, franchises, and international stars.",
    gradient: "from-blue-900/80 via-indigo-950/60 to-black",
    accent: "#3b82f6",
  },
];

export const COMPETITIONS: CompetitionOption[] = [
  { id: "premier-league", name: "Premier League", sport: "football", region: "England", gradient: "from-purple-900/70 to-violet-950" },
  { id: "la-liga", name: "La Liga", sport: "football", region: "Spain", gradient: "from-orange-900/70 to-red-950" },
  { id: "serie-a", name: "Serie A", sport: "football", region: "Italy", gradient: "from-blue-900/70 to-sky-950" },
  { id: "bundesliga", name: "Bundesliga", sport: "football", region: "Germany", gradient: "from-red-900/70 to-rose-950" },
  { id: "ucl", name: "UEFA Champions League", sport: "football", region: "Europe", gradient: "from-indigo-900/70 to-blue-950" },
  { id: "uel", name: "Europa League", sport: "football", region: "Europe", gradient: "from-orange-900/70 to-amber-950" },
  { id: "world-cup", name: "FIFA World Cup", sport: "football", region: "Global", gradient: "from-emerald-900/70 to-teal-950" },
  { id: "copa-america", name: "Copa America", sport: "football", region: "South America", gradient: "from-yellow-900/70 to-amber-950" },
  { id: "euro", name: "UEFA Euro", sport: "football", region: "Europe", gradient: "from-blue-900/70 to-cyan-950" },
  { id: "ipl", name: "IPL", sport: "cricket", region: "India", gradient: "from-blue-900/70 to-indigo-950" },
  { id: "icc-world-cup", name: "ICC Cricket World Cup", sport: "cricket", region: "Global", gradient: "from-sky-900/70 to-blue-950" },
  { id: "champions-trophy", name: "ICC Champions Trophy", sport: "cricket", region: "Global", gradient: "from-teal-900/70 to-cyan-950" },
  { id: "t20-world-cup", name: "T20 World Cup", sport: "cricket", region: "Global", gradient: "from-violet-900/70 to-purple-950" },
  { id: "bbl", name: "Big Bash League", sport: "cricket", region: "Australia", gradient: "from-orange-900/70 to-red-950" },
  { id: "psl", name: "PSL", sport: "cricket", region: "Pakistan", gradient: "from-green-900/70 to-emerald-950" },
  { id: "sa20", name: "SA20", sport: "cricket", region: "South Africa", gradient: "from-yellow-900/70 to-green-950" },
  { id: "ashes", name: "The Ashes", sport: "cricket", region: "England / Australia", gradient: "from-red-900/70 to-rose-950" },
  { id: "ilt20", name: "ILT20", sport: "cricket", region: "UAE", gradient: "from-cyan-900/70 to-blue-950" },
];

export const TEAMS: TeamOption[] = [
  { id: "barcelona", name: "Barcelona", sport: "football", competitionIds: ["la-liga", "ucl"], shortName: "BAR", color: "#a50044", emoji: "🔵🔴" },
  { id: "real-madrid", name: "Real Madrid", sport: "football", competitionIds: ["la-liga", "ucl"], shortName: "RMA", color: "#febe10", emoji: "⚪" },
  { id: "man-city", name: "Manchester City", sport: "football", competitionIds: ["premier-league", "ucl"], shortName: "MCI", color: "#6cabdd", emoji: "🔵" },
  { id: "liverpool", name: "Liverpool", sport: "football", competitionIds: ["premier-league", "ucl"], shortName: "LIV", color: "#c8102e", emoji: "🔴" },
  { id: "arsenal", name: "Arsenal", sport: "football", competitionIds: ["premier-league", "ucl"], shortName: "ARS", color: "#ef0107", emoji: "🔴" },
  { id: "bayern", name: "Bayern Munich", sport: "football", competitionIds: ["bundesliga", "ucl"], shortName: "BAY", color: "#dc052d", emoji: "🔴" },
  { id: "inter", name: "Inter Milan", sport: "football", competitionIds: ["serie-a", "ucl"], shortName: "INT", color: "#0068a8", emoji: "🔵⚫" },
  { id: "juventus", name: "Juventus", sport: "football", competitionIds: ["serie-a", "ucl"], shortName: "JUV", color: "#000000", emoji: "⚫⚪" },
  { id: "psg", name: "PSG", sport: "football", competitionIds: ["ucl"], shortName: "PSG", color: "#004170", emoji: "🔵🔴" },
  { id: "chelsea", name: "Chelsea", sport: "football", competitionIds: ["premier-league", "ucl"], shortName: "CHE", color: "#034694", emoji: "🔵" },
  { id: "india", name: "India", sport: "cricket", competitionIds: ["icc-world-cup", "t20-world-cup", "champions-trophy"], shortName: "IND", color: "#138808", emoji: "🇮🇳" },
  { id: "australia", name: "Australia", sport: "cricket", competitionIds: ["icc-world-cup", "ashes", "bbl"], shortName: "AUS", color: "#ffcd00", emoji: "🇦🇺" },
  { id: "england", name: "England", sport: "cricket", competitionIds: ["icc-world-cup", "ashes"], shortName: "ENG", color: "#cf142b", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "south-africa", name: "South Africa", sport: "cricket", competitionIds: ["icc-world-cup", "sa20"], shortName: "SA", color: "#007a4d", emoji: "🇿🇦" },
  { id: "new-zealand", name: "New Zealand", sport: "cricket", competitionIds: ["icc-world-cup", "t20-world-cup"], shortName: "NZ", color: "#000000", emoji: "🇳🇿" },
  { id: "rcb", name: "RCB", sport: "cricket", competitionIds: ["ipl"], shortName: "RCB", color: "#ec1c24", emoji: "🔴" },
  { id: "csk", name: "CSK", sport: "cricket", competitionIds: ["ipl"], shortName: "CSK", color: "#ffdd00", emoji: "🟡" },
  { id: "mi", name: "Mumbai Indians", sport: "cricket", competitionIds: ["ipl"], shortName: "MI", color: "#004ba0", emoji: "🔵" },
  { id: "kkr", name: "KKR", sport: "cricket", competitionIds: ["ipl"], shortName: "KKR", color: "#3a225d", emoji: "🟣" },
  { id: "gt", name: "GT", sport: "cricket", competitionIds: ["ipl"], shortName: "GT", color: "#1c2c5b", emoji: "🔵" },
  { id: "rr", name: "RR", sport: "cricket", competitionIds: ["ipl"], shortName: "RR", color: "#e73895", emoji: "🩷" },
];

export const PLAYERS: PlayerOption[] = [
  { id: "lamine-yamal", name: "Lamine Yamal", teamId: "barcelona", position: "Forward", sport: "football", gradient: "from-blue-600 to-indigo-800" },
  { id: "pedri", name: "Pedri", teamId: "barcelona", position: "Midfielder", sport: "football", gradient: "from-sky-600 to-blue-800" },
  { id: "lewandowski", name: "Lewandowski", teamId: "barcelona", position: "Forward", sport: "football", gradient: "from-red-600 to-rose-800" },
  { id: "raphinha", name: "Raphinha", teamId: "barcelona", position: "Forward", sport: "football", gradient: "from-amber-600 to-orange-800" },
  { id: "de-jong", name: "Frenkie de Jong", teamId: "barcelona", position: "Midfielder", sport: "football", gradient: "from-cyan-600 to-teal-800" },
  { id: "mbappe", name: "Kylian Mbappé", teamId: "real-madrid", position: "Forward", sport: "football", gradient: "from-yellow-500 to-amber-700" },
  { id: "bellingham", name: "Jude Bellingham", teamId: "real-madrid", position: "Midfielder", sport: "football", gradient: "from-slate-600 to-zinc-800" },
  { id: "haaland", name: "Erling Haaland", teamId: "man-city", position: "Forward", sport: "football", gradient: "from-sky-500 to-blue-700" },
  { id: "salah", name: "Mohamed Salah", teamId: "liverpool", position: "Forward", sport: "football", gradient: "from-red-500 to-rose-700" },
  { id: "saka", name: "Bukayo Saka", teamId: "arsenal", position: "Forward", sport: "football", gradient: "from-red-600 to-red-900" },
  { id: "kane", name: "Harry Kane", teamId: "bayern", position: "Forward", sport: "football", gradient: "from-red-700 to-red-950" },
  { id: "lautaro", name: "Lautaro Martínez", teamId: "inter", position: "Forward", sport: "football", gradient: "from-blue-600 to-blue-900" },
  { id: "kohli", name: "Virat Kohli", teamId: "india", position: "Batsman", sport: "cricket", gradient: "from-blue-600 to-indigo-800" },
  { id: "bumrah", name: "Jasprit Bumrah", teamId: "india", position: "Bowler", sport: "cricket", gradient: "from-sky-600 to-cyan-800" },
  { id: "gill", name: "Shubman Gill", teamId: "india", position: "Batsman", sport: "cricket", gradient: "from-teal-600 to-emerald-800" },
  { id: "pandya", name: "Hardik Pandya", teamId: "india", position: "All-rounder", sport: "cricket", gradient: "from-violet-600 to-purple-800" },
  { id: "rohit", name: "Rohit Sharma", teamId: "india", position: "Batsman", sport: "cricket", gradient: "from-orange-600 to-amber-800" },
  { id: "smith", name: "Steve Smith", teamId: "australia", position: "Batsman", sport: "cricket", gradient: "from-yellow-600 to-amber-800" },
  { id: "starc", name: "Mitchell Starc", teamId: "australia", position: "Bowler", sport: "cricket", gradient: "from-green-600 to-emerald-800" },
  { id: "buttler", name: "Jos Buttler", teamId: "england", position: "Wicket-keeper", sport: "cricket", gradient: "from-blue-700 to-indigo-900" },
  { id: "root", name: "Joe Root", teamId: "england", position: "Batsman", sport: "cricket", gradient: "from-red-700 to-rose-900" },
  { id: "rabada", name: "Kagiso Rabada", teamId: "south-africa", position: "Bowler", sport: "cricket", gradient: "from-green-700 to-lime-900" },
  { id: "williamson", name: "Kane Williamson", teamId: "new-zealand", position: "Batsman", sport: "cricket", gradient: "from-slate-600 to-gray-800" },
  { id: "kohli-rcb", name: "Virat Kohli", teamId: "rcb", position: "Batsman", sport: "cricket", gradient: "from-red-600 to-rose-800" },
  { id: "dhoni", name: "MS Dhoni", teamId: "csk", position: "Wicket-keeper", sport: "cricket", gradient: "from-yellow-500 to-amber-700" },
  { id: "rohit-mi", name: "Rohit Sharma", teamId: "mi", position: "Batsman", sport: "cricket", gradient: "from-blue-600 to-blue-800" },
  { id: "russell", name: "Andre Russell", teamId: "kkr", position: "All-rounder", sport: "cricket", gradient: "from-purple-600 to-violet-800" },
  { id: "shubman-gt", name: "Shubman Gill", teamId: "gt", position: "Batsman", sport: "cricket", gradient: "from-cyan-600 to-blue-800" },
  { id: "samson", name: "Sanju Samson", teamId: "rr", position: "Wicket-keeper", sport: "cricket", gradient: "from-pink-600 to-rose-800" },
];

export const NOTIFICATIONS: PreferenceOption[] = [
  { id: "match-starts", label: "Match Starts", description: "Get notified when your teams kick off", icon: "⏱️" },
  { id: "goals", label: "Goals", description: "Instant alerts for every goal scored", icon: "⚽" },
  { id: "wickets", label: "Wickets", description: "Never miss a crucial dismissal", icon: "🏏" },
  { id: "lineups", label: "Lineups", description: "Starting XI announcements", icon: "📋" },
  { id: "transfer-news", label: "Transfer News", description: "Breaking transfer updates", icon: "🔄" },
  { id: "breaking-news", label: "Breaking News", description: "Major stories as they happen", icon: "📰" },
  { id: "injury-updates", label: "Injury Updates", description: "Player fitness and availability", icon: "🏥" },
  { id: "final-scores", label: "Final Scores", description: "Full-time and match results", icon: "🏆" },
  { id: "milestones", label: "Milestones", description: "Records and career achievements", icon: "⭐" },
  { id: "tournament-updates", label: "Tournament Updates", description: "Draws, schedules, and standings", icon: "📅" },
];

export const CONTENT_PREFERENCES: PreferenceOption[] = [
  { id: "live-scores", label: "Live Scores", description: "Real-time match updates", icon: "📊" },
  { id: "statistics", label: "Statistics", description: "Deep performance data", icon: "📈" },
  { id: "player-analytics", label: "Player Analytics", description: "AI-powered player insights", icon: "🧠" },
  { id: "match-analysis", label: "Match Analysis", description: "Post-match breakdowns", icon: "🔍" },
  { id: "transfers", label: "Transfers", description: "Market moves and rumors", icon: "💰" },
  { id: "breaking-news", label: "Breaking News", description: "Latest headlines", icon: "📰" },
  { id: "fantasy-sports", label: "Fantasy Sports", description: "Build your dream team", icon: "🎮" },
  { id: "predictions", label: "Predictions", description: "AI match forecasts", icon: "🔮" },
  { id: "tactical-analysis", label: "Tactical Analysis", description: "Formation and strategy deep dives", icon: "♟️" },
  { id: "player-comparisons", label: "Player Comparisons", description: "Head-to-head stat battles", icon: "⚔️" },
  { id: "historical-records", label: "Historical Records", description: "Legends and all-time stats", icon: "📜" },
];

export const BUILDING_MESSAGES = [
  "Importing your favorite teams...",
  "Preparing live scores...",
  "Loading player statistics...",
  "Creating your sports feed...",
  "Almost ready...",
];

export function getCompetitionsForSports(sports: Sport[]) {
  return COMPETITIONS.filter((c) => sports.includes(c.sport));
}

export function getTeamsForCompetitions(competitionIds: string[]) {
  if (competitionIds.length === 0) return [];
  return TEAMS.filter((t) =>
    t.competitionIds.some((id) => competitionIds.includes(id))
  );
}

export function getPlayersForTeams(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  return PLAYERS.filter((p) => teamIds.includes(p.teamId));
}

export function getTeamById(id: string) {
  return TEAMS.find((t) => t.id === id);
}

export function getCompetitionById(id: string) {
  return COMPETITIONS.find((c) => c.id === id);
}

export function getSportById(id: Sport) {
  return SPORTS.find((s) => s.id === id);
}

export function getPlayerById(id: string) {
  return PLAYERS.find((p) => p.id === id);
}
