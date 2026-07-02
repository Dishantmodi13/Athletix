import Parser from "rss-parser";
import type { RawNewsItem } from "@/types/news";

export interface RssFeedConfig {
  name: string;
  url: string;
  fallbackUrls?: string[];
}

/** Primary + fallback RSS endpoints — failed feeds are skipped gracefully. */
export const RSS_FEEDS: RssFeedConfig[] = [
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { name: "ESPN FC", url: "https://www.espn.com/espn/rss/soccer/news" },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
  {
    name: "Goal",
    url: "https://www.goal.com/feeds/en/news",
    fallbackUrls: ["https://www.goal.com/feeds/rss/news", "https://www.goal.com/en/rss/news"],
  },
  { name: "90min", url: "https://www.90min.com/posts.rss" },
  { name: "FourFourTwo", url: "https://www.fourfourtwo.com/feeds/all" },
  { name: "Yahoo Sports", url: "https://sports.yahoo.com/soccer/rss.xml" },
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/soccer" },
  {
    name: "Eurosport",
    url: "https://www.eurosport.com/football.rss",
    fallbackUrls: ["https://www.eurosport.com/football/rss.xml", "https://www.eurosport.com/rss.xml"],
  },
  {
    name: "Football365",
    url: "https://www.football365.com/feed",
    fallbackUrls: ["https://www.football365.com/feed.atom", "https://www.football365.com/rss.xml"],
  },
  { name: "Planet Football", url: "https://www.planetfootball.com/feed/" },
  { name: "The Guardian", url: "https://www.theguardian.com/football/rss" },
  { name: "talkSPORT", url: "https://talksport.com/football/feed/" },
];

const FETCH_HEADERS = {
  "User-Agent": "AthletixNewsBot/1.0 (Football News Aggregator)",
  Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
};

const parser = new Parser({
  timeout: 14_000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["enclosure", "enclosure", { keepArray: false }],
    ],
  },
});

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickImage(item: Parser.Item & Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && (!enclosure.type || enclosure.type.startsWith("image"))) {
    return enclosure.url;
  }

  const mediaContent = item.mediaContent as Array<{ $?: { url?: string } }> | undefined;
  const fromMedia = mediaContent?.[0]?.$?.url;
  if (fromMedia) return fromMedia;

  const mediaThumbnail = item.mediaThumbnail as Array<{ $?: { url?: string } }> | undefined;
  const fromThumb = mediaThumbnail?.[0]?.$?.url;
  if (fromThumb) return fromThumb;

  const content = item.content ?? item["content:encoded"] ?? "";
  const match = String(content).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function normalizeRssItem(item: Parser.Item, source: string): RawNewsItem | null {
  const title = stripHtml(item.title ?? "");
  const url = item.link ?? item.guid ?? "";
  if (!title || !url) return null;

  const description = stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? "");
  const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();

  const author =
    item.creator ??
    (item as Parser.Item & { author?: string }).author ??
    null;

  return {
    title,
    description: description.slice(0, 400),
    image: pickImage(item as Parser.Item & Record<string, unknown>),
    url,
    publishedAt: new Date(publishedAt).toISOString(),
    source,
    author,
  };
}

async function fetchFeedXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(14_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}

async function parseFeedFromUrl(url: string, source: string): Promise<RawNewsItem[]> {
  const xml = await fetchFeedXml(url);
  const parsed = await parser.parseString(xml);
  return (parsed.items ?? [])
    .map((item) => normalizeRssItem(item, source))
    .filter((item): item is RawNewsItem => item !== null);
}

export async function fetchRssFeed(feed: RssFeedConfig): Promise<RawNewsItem[]> {
  const urls = [feed.url, ...(feed.fallbackUrls ?? [])];

  for (const url of urls) {
    try {
      const items = await parseFeedFromUrl(url, feed.name);
      if (items.length > 0) {
        console.log(`[News RSS] ${feed.name}: ${items.length} articles`);
        return items;
      }
    } catch (error) {
      console.warn(`[News RSS] ${feed.name} (${url}):`, (error as Error).message);
    }
  }

  console.warn(`[News RSS] Skipped ${feed.name} — all URLs failed`);
  return [];
}

export async function fetchAllRssFeeds(): Promise<RawNewsItem[]> {
  const results = await Promise.all(RSS_FEEDS.map((feed) => fetchRssFeed(feed)));
  const merged = results.flat();
  const sources = new Set(merged.map((item) => item.source));
  console.log(`[News RSS] Total: ${merged.length} articles from ${sources.size} sources`);
  return merged;
}
