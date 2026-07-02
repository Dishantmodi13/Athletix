import { NextRequest, NextResponse } from "next/server";
import type { NewsCategory } from "@/types/news";
import { fetchMergedNews, filterNewsArticles, getCacheTimestamp } from "@/services/news/mergeNews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 720;

const VALID_CATEGORIES = new Set<NewsCategory | "all">([
  "all",
  "latest",
  "breaking",
  "transfers",
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "champions-league",
  "international",
  "players",
  "clubs",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categoryParam = (searchParams.get("category") ?? "all") as NewsCategory | "all";
    const category = VALID_CATEGORIES.has(categoryParam) ? categoryParam : "all";
    const search = searchParams.get("q") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const articles = await fetchMergedNews();
    const result = filterNewsArticles(articles, { category, search, page, limit });

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      cachedAt: getCacheTimestamp(),
    });
  } catch (error) {
    console.error("[News API]", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
        cachedAt: new Date().toISOString(),
        message: "Failed to load football news",
      },
      { status: 200 }
    );
  }
}
