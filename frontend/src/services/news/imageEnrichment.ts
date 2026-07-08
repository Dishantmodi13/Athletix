import type { RawNewsItem } from "@/types/news";

const FETCH_HEADERS = {
  "User-Agent": "AthletixNewsBot/1.0 (Football News Aggregator)",
  Accept: "text/html,application/xhtml+xml",
};

const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
];

const ogImageCache = new Map<string, string | null>();
const MAX_ENRICH_PER_REFRESH = 45;
const ENRICH_CONCURRENCY = 6;

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "0.0.0.0") return true;

  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

export function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveUrl(base: string, src: string): string | null {
  try {
    return new URL(src.trim(), base).href;
  } catch {
    return null;
  }
}

function extractOgImage(html: string, pageUrl: string): string | null {
  const chunk = html.slice(0, 120_000);

  for (const pattern of OG_IMAGE_PATTERNS) {
    const match = chunk.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;

    const resolved = resolveUrl(pageUrl, raw);
    if (resolved && isPublicHttpUrl(resolved)) {
      return resolved;
    }
  }

  const imgMatch = chunk.match(/<img[^>]+src=["']([^"']+)["']/i);
  const imgSrc = imgMatch?.[1]?.trim();
  if (imgSrc) {
    const resolved = resolveUrl(pageUrl, imgSrc);
    if (resolved && isPublicHttpUrl(resolved) && !resolved.includes("pixel") && !resolved.includes("1x1")) {
      return resolved;
    }
  }

  return null;
}

export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  if (!isPublicHttpUrl(articleUrl)) return null;

  const cached = ogImageCache.get(articleUrl);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(articleUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(6_000),
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      ogImageCache.set(articleUrl, null);
      return null;
    }

    const html = await res.text();
    const image = extractOgImage(html, articleUrl);
    ogImageCache.set(articleUrl, image);
    return image;
  } catch {
    ogImageCache.set(articleUrl, null);
    return null;
  }
}

async function enrichBatch(items: RawNewsItem[]): Promise<void> {
  await Promise.all(
    items.map(async (item) => {
      const image = await fetchOgImage(item.url);
      if (image) item.image = image;
    })
  );
}

/** Fetch og:image for RSS items that ship without thumbnails. */
export async function enrichMissingImages(items: RawNewsItem[]): Promise<void> {
  const missing = items.filter((item) => !item.image?.trim());
  if (missing.length === 0) return;

  const toEnrich = missing.slice(0, MAX_ENRICH_PER_REFRESH);
  for (let i = 0; i < toEnrich.length; i += ENRICH_CONCURRENCY) {
    await enrichBatch(toEnrich.slice(i, i + ENRICH_CONCURRENCY));
  }

  const enriched = toEnrich.filter((item) => item.image).length;
  if (enriched > 0) {
    console.log(`[News] Enriched ${enriched}/${toEnrich.length} articles with og:image`);
  }
}
