import type { NewsCategory } from "@/types/news";
import { NEWS_CATEGORIES } from "@/types/news";

const CATEGORY_STYLES: Record<NewsCategory, string> = {
  breaking: "bg-red-500/15 text-red-300 ring-red-500/30",
  transfers: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  "premier-league": "bg-purple-500/15 text-purple-300 ring-purple-500/30",
  "la-liga": "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  "serie-a": "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  bundesliga: "bg-yellow-500/15 text-yellow-200 ring-yellow-500/30",
  "ligue-1": "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  "champions-league": "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  international: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  players: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  clubs: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  latest: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
};

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  breaking: "Breaking News",
  transfers: "Transfer Centre",
  "premier-league": "Premier League",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  "champions-league": "Champions League",
  international: "International",
  players: "Player News",
  clubs: "Club News",
  latest: "Latest",
};

export function formatNewsTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function getCategoryStyle(category: NewsCategory): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.latest;
}

export function getCategoryLabel(category: NewsCategory): string {
  return CATEGORY_LABELS[category] ?? "News";
}

export function getCategoryMeta(category: NewsCategory) {
  return (
    NEWS_CATEGORIES.find((c) => c.id === category) ?? {
      id: category,
      label: getCategoryLabel(category),
      emoji: "⚽",
    }
  );
}

export function getPlaceholderImage(seed: string): string {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hues = [220, 250, 200, 170, 280, 320];
  const hue = hues[hash % hues.length];
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},60%,18%)"/><stop offset="100%" stop-color="hsl(${hue},50%,10%)"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/><circle cx="400" cy="225" r="72" fill="none" stroke="hsl(${hue},70%,45%)" stroke-width="3" opacity="0.5"/><path d="M368 225 L400 193 L432 225 L400 257 Z" fill="hsl(${hue},70%,50%)" opacity="0.35"/></svg>`
  )}`;
}
