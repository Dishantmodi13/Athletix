import { NextRequest, NextResponse } from "next/server";
import type { RawNewsItem } from "@/types/news";
import { fetchRssFeed, type RssFeedConfig } from "@/services/news/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRICKET_FEEDS: RssFeedConfig[] = [
  {
    name: "ESPNcricinfo",
    url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
  },
  { name: "BBC Cricket", url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml" },
  {
    name: "Sky Sports Cricket",
    url: "https://www.skysports.com/rss/12028",
    fallbackUrls: ["https://www.skysports.com/rss/0,20514,12123,00.xml"],
  },
  { name: "The Guardian", url: "https://www.theguardian.com/sport/cricket/rss" },
  {
    name: "Cricket Addictor",
    url: "https://cricketaddictor.com/feed/",
  },
];

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedArticles: RawNewsItem[] | null = null;
let cachedAt = 0;

async function loadCricketNews(): Promise<RawNewsItem[]> {
  if (cachedArticles && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedArticles;
  }

  const results = await Promise.all(CRICKET_FEEDS.map((feed) => fetchRssFeed(feed)));
  const merged = results.flat();

  // Dedupe by normalized title, newest first.
  const seen = new Set<string>();
  const deduped = merged
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (deduped.length > 0) {
    cachedArticles = deduped;
    cachedAt = Date.now();
  }

  return deduped;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "24") || 24));
    const search = (searchParams.get("q") ?? "").trim().toLowerCase();

    let articles = await loadCricketNews();
    if (search) {
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search)
      );
    }

    const start = (page - 1) * limit;
    const pageItems = articles.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: pageItems.map((item, i) => ({
        ...item,
        id: `cricket-${start + i}-${item.url.slice(-24)}`,
        category: "latest",
      })),
      total: articles.length,
      page,
      limit,
      hasMore: start + limit < articles.length,
      cachedAt: new Date(cachedAt || Date.now()).toISOString(),
    });
  } catch (error) {
    console.error("[Cricket News API]", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        total: 0,
        page: 1,
        limit: 24,
        hasMore: false,
        cachedAt: new Date().toISOString(),
        message: "Failed to load cricket news",
      },
      { status: 200 }
    );
  }
}
