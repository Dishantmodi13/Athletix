import { NextRequest, NextResponse } from "next/server";
import { isPublicHttpUrl } from "@/services/news/imageEnrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  "User-Agent": "AthletixNewsBot/1.0 (Football News Aggregator)",
  Accept: "image/*,*/*",
  Referer: "",
};

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl || !isPublicHttpUrl(rawUrl)) {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new NextResponse("Image not found", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 });
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Failed to load image", { status: 502 });
  }
}
