import type { RawNewsItem } from "@/types/news";

interface GNewsArticle {
  title: string;
  description: string;
  content?: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

/** Targeted queries to supplement RSS — especially transfers and leagues with weak RSS. */
const GNEWS_QUERIES = [
  "football transfer OR signing OR loan deal",
  "premier league football",
  "la liga OR serie a OR bundesliga OR ligue 1",
  "champions league OR europa league uefa",
  "international football OR world cup OR nations league",
];

function mapGNewsArticle(article: GNewsArticle): RawNewsItem {
  return {
    title: article.title,
    description: article.description?.slice(0, 400) ?? "",
    image: article.image ?? null,
    url: article.url,
    publishedAt: new Date(article.publishedAt).toISOString(),
    source: article.source?.name ?? "GNews",
    author: null,
  };
}

async function fetchGNewsQuery(apiKey: string, query: string): Promise<RawNewsItem[]> {
  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: "25",
    sortby: "publishedAt",
    apikey: apiKey,
  });

  const res = await fetch(`${GNEWS_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    console.warn(`[News GNews] HTTP ${res.status} for query: ${query.slice(0, 40)}`);
    return [];
  }

  const body = (await res.json()) as GNewsResponse;
  return (body.articles ?? []).map(mapGNewsArticle);
}

export function isGNewsConfigured(): boolean {
  return Boolean(process.env.GNEWS_API_KEY?.trim());
}

/** Supplement RSS with GNews when a key is configured. */
export function shouldSupplementWithGNews(rssCount: number): boolean {
  if (!isGNewsConfigured()) return false;
  return rssCount < 80;
}

export async function fetchGNewsArticles(): Promise<RawNewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  try {
    const batches = await Promise.all(
      GNEWS_QUERIES.map((query) =>
        fetchGNewsQuery(apiKey, query).catch((error) => {
          console.warn(`[News GNews] Query failed:`, (error as Error).message);
          return [] as RawNewsItem[];
        })
      )
    );

    const merged = batches.flat();
    console.log(`[News GNews] Supplement: ${merged.length} articles`);
    return merged;
  } catch (error) {
    console.warn("[News GNews] Fetch failed:", (error as Error).message);
    return [];
  }
}
