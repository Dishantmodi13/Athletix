import { createHash } from "crypto";
import type { NewsArticle, NewsCategory, RawNewsItem } from "@/types/news";
import { fetchAllRssFeeds } from "./rss";
import { fetchGNewsArticles, shouldSupplementWithGNews } from "./gnews";
import { enrichMissingImages } from "./imageEnrichment";

const CACHE_TTL_MS = 12 * 60 * 1000;
const MAX_ARTICLES = 150;

let cachedArticles: NewsArticle[] | null = null;
let cachedAt = 0;

const BREAKING_KEYWORDS = ["breaking", "exclusive", "confirmed", "official", "urgent", "done deal"];

const TRANSFER_KEYWORDS = [
  "transfer",
  "signing",
  "signed",
  "deal",
  "loan",
  "bid",
  "fee",
  "contract",
  "window",
  "move to",
  "joins",
  "agrees",
  "medical",
  "here we go",
];

const CHAMPIONS_LEAGUE_KEYWORDS = [
  "champions league",
  "ucl",
  "europa league",
  "conference league",
  "knockout",
  "group stage",
  "real madrid champions",
  "bayern champions",
];

const PREMIER_LEAGUE_KEYWORDS = [
  "premier league",
  "epl",
  "manchester united",
  "manchester city",
  "liverpool",
  "arsenal",
  "chelsea",
  "tottenham",
  "newcastle",
  "aston villa",
  "west ham",
  "everton",
  "crystal palace",
  "fulham",
  "bournemouth",
  "brentford",
  "nottingham forest",
  "wolves",
  "brighton",
  "leicester",
  "ipswich",
  "southampton",
];

const LA_LIGA_KEYWORDS = [
  "la liga",
  "laliga",
  "real madrid",
  "barcelona",
  "atletico madrid",
  "atlético",
  "sevilla",
  "real sociedad",
  "villarreal",
  "athletic bilbao",
  "real betis",
];

const SERIE_A_KEYWORDS = [
  "serie a",
  "ac milan",
  "inter milan",
  "juventus",
  "napoli",
  "roma",
  "lazio",
  "atalanta",
  "fiorentina",
  "torino",
];

const BUNDESLIGA_KEYWORDS = [
  "bundesliga",
  "bayern munich",
  "borussia dortmund",
  "rb leipzig",
  "bayer leverkusen",
  "stuttgart",
  "frankfurt",
  "wolfsburg",
  "gladbach",
  "werder bremen",
];

const LIGUE_1_KEYWORDS = [
  "ligue 1",
  "ligue1",
  "psg",
  "paris saint-germain",
  "marseille",
  "monaco",
  "lyon",
  "lille",
  "nice",
  "lens",
  "rennes",
];

const INTERNATIONAL_KEYWORDS = [
  "world cup",
  "nations league",
  "euro 20",
  "copa america",
  "international",
  "national team",
  "fifa",
  "qualifier",
  "england national",
  "brazil national",
  "argentina national",
  "spain national",
  "france national",
  "germany national",
];

const PLAYER_KEYWORDS = [
  "injury",
  "injured",
  "hat-trick",
  "goal scorer",
  "captain",
  "striker",
  "midfielder",
  "defender",
  "goalkeeper",
  "ballon d'or",
  "player of the",
];

const CLUB_KEYWORDS = [
  "manager",
  "head coach",
  "coach",
  "sacked",
  "appointed",
  "owner",
  "takeover",
  "stadium",
  "board",
  "chairman",
  "director",
];

type CategoryRule = { category: NewsCategory; keywords: string[] };

const CATEGORY_RULES: CategoryRule[] = [
  { category: "transfers", keywords: TRANSFER_KEYWORDS },
  { category: "champions-league", keywords: CHAMPIONS_LEAGUE_KEYWORDS },
  { category: "premier-league", keywords: PREMIER_LEAGUE_KEYWORDS },
  { category: "la-liga", keywords: LA_LIGA_KEYWORDS },
  { category: "serie-a", keywords: SERIE_A_KEYWORDS },
  { category: "bundesliga", keywords: BUNDESLIGA_KEYWORDS },
  { category: "ligue-1", keywords: LIGUE_1_KEYWORDS },
  { category: "international", keywords: INTERNATIONAL_KEYWORDS },
  { category: "players", keywords: PLAYER_KEYWORDS },
  { category: "clubs", keywords: CLUB_KEYWORDS },
];

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function buildId(url: string, title: string): string {
  return createHash("sha256").update(`${normalizeUrl(url)}|${normalizeTitle(title)}`).digest("hex").slice(0, 16);
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function inferCategory(item: RawNewsItem): NewsCategory {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const published = new Date(item.publishedAt).getTime();
  const isRecent = Date.now() - published < 4 * 60 * 60 * 1000;

  if (isRecent && matchesKeywords(text, BREAKING_KEYWORDS)) {
    return "breaking";
  }

  for (const rule of CATEGORY_RULES) {
    if (matchesKeywords(text, rule.keywords)) {
      return rule.category;
    }
  }

  return "latest";
}

function toNewsArticle(item: RawNewsItem): NewsArticle {
  return {
    id: buildId(item.url, item.title),
    title: item.title,
    description: item.description,
    image: item.image,
    url: item.url,
    publishedAt: item.publishedAt,
    source: item.source,
    category: inferCategory(item),
    author: item.author,
  };
}

export function dedupeArticles(items: RawNewsItem[]): RawNewsItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: RawNewsItem[] = [];

  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  for (const item of sorted) {
    const urlKey = normalizeUrl(item.url);
    const titleKey = normalizeTitle(item.title);

    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;

    const publishedMs = new Date(item.publishedAt).getTime();
    const duplicateByTime = deduped.some((existing) => {
      const existingTitle = normalizeTitle(existing.title);
      const timeDiff = Math.abs(new Date(existing.publishedAt).getTime() - publishedMs);
      return existingTitle === titleKey && timeDiff < 60 * 60 * 1000;
    });

    if (duplicateByTime) continue;

    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    deduped.push(item);
  }

  return deduped;
}

export async function fetchMergedNews(): Promise<NewsArticle[]> {
  const now = Date.now();
  if (cachedArticles && now - cachedAt < CACHE_TTL_MS) {
    return cachedArticles;
  }

  const rssItems = await fetchAllRssFeeds();
  let allItems = [...rssItems];

  if (shouldSupplementWithGNews(rssItems.length)) {
    const gnewsItems = await fetchGNewsArticles();
    allItems = [...allItems, ...gnewsItems];
  }

  const deduped = dedupeArticles(allItems);
  await enrichMissingImages(deduped);

  const articles = deduped
    .map(toNewsArticle)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ARTICLES);

  cachedArticles = articles;
  cachedAt = now;

  const sourceCount = new Set(articles.map((a) => a.source)).size;
  console.log(`[News] Merged ${articles.length} articles from ${sourceCount} sources`);

  return articles;
}

export function filterNewsArticles(
  articles: NewsArticle[],
  options: {
    category?: NewsCategory | "all";
    search?: string;
    page?: number;
    limit?: number;
  }
): { data: NewsArticle[]; total: number; page: number; limit: number; hasMore: boolean } {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const search = options.search?.trim().toLowerCase() ?? "";
  const category = options.category ?? "all";

  let filtered = articles;

  if (category !== "all" && category !== "latest") {
    filtered = filtered.filter((article) => article.category === category);
  }

  if (search) {
    filtered = filtered.filter((article) => {
      const haystack = `${article.title} ${article.description} ${article.source}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    data,
    total,
    page,
    limit,
    hasMore: start + limit < total,
  };
}

export function getCacheTimestamp(): string {
  return cachedAt ? new Date(cachedAt).toISOString() : new Date().toISOString();
}
