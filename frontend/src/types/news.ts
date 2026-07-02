export type NewsCategory =
  | "breaking"
  | "transfers"
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "champions-league"
  | "international"
  | "players"
  | "clubs"
  | "latest";

export const NEWS_CATEGORIES: Array<{ id: NewsCategory; label: string; emoji: string }> = [
  { id: "breaking", label: "Breaking News", emoji: "🔥" },
  { id: "transfers", label: "Transfer Centre", emoji: "🔄" },
  { id: "premier-league", label: "Premier League", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "la-liga", label: "La Liga", emoji: "🇪🇸" },
  { id: "serie-a", label: "Serie A", emoji: "🇮🇹" },
  { id: "bundesliga", label: "Bundesliga", emoji: "🇩🇪" },
  { id: "ligue-1", label: "Ligue 1", emoji: "🇫🇷" },
  { id: "champions-league", label: "Champions League", emoji: "🏆" },
  { id: "international", label: "International", emoji: "🌍" },
  { id: "players", label: "Player News", emoji: "⭐" },
  { id: "clubs", label: "Club News", emoji: "🏟️" },
];

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  image: string | null;
  url: string;
  publishedAt: string;
  source: string;
  category: NewsCategory;
  author: string | null;
}

export interface NewsApiResponse {
  success: boolean;
  data: NewsArticle[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  cachedAt: string;
}

export interface RawNewsItem {
  title: string;
  description: string;
  image: string | null;
  url: string;
  publishedAt: string;
  source: string;
  author: string | null;
}
