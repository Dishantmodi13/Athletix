"use client";

import { Newspaper, Search } from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { useFetch } from "@/hooks/useFetch";
import { formatNewsTime, getNewsImageSrc } from "@/lib/news";
import type { NewsApiResponse, NewsArticle } from "@/types/news";

async function fetchCricketNews(page: number, query: string): Promise<NewsApiResponse> {
  const params = new URLSearchParams({ page: String(page), limit: "24" });
  if (query.trim()) params.set("q", query.trim());

  const res = await fetch(`/api/cricket-news?${params.toString()}`);
  const body = (await res.json()) as NewsApiResponse & { message?: string };
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "Failed to load cricket news");
  }
  return body;
}

function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="auth-glass-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:border-athletix-primary/30 hover:shadow-[0_0_30px_-12px_rgba(59,130,246,0.4)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-white/[0.03]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getNewsImageSrc(article.image, article.id)}
          alt=""
          loading={index < 6 ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] text-athletix-text-muted">
          <span className="font-semibold text-athletix-primary">{article.source}</span>
          <span>·</span>
          <span>{formatNewsTime(article.publishedAt)}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-athletix-primary">
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-athletix-text-muted">
            {article.description}
          </p>
        )}
      </div>
    </a>
  );
}

function SkeletonNewsCard() {
  return (
    <div className="auth-glass-card animate-pulse overflow-hidden rounded-2xl">
      <div className="aspect-[16/9] w-full bg-white/[0.04]" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
        <div className="h-4 w-full rounded bg-white/[0.06]" />
        <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

export default function CricketNewsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);

  const news = useFetch(() => fetchCricketNews(page, submittedQuery), [page, submittedQuery]);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeader
        title="Cricket News"
        icon={<Newspaper className="h-5 w-5" />}
        action={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSubmittedQuery(query);
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-athletix-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cricket news…"
              className="w-44 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-white placeholder:text-athletix-text-muted focus:border-athletix-primary/40 focus:outline-none sm:w-64"
            />
          </form>
        }
      />

      {news.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonNewsCard key={i} />
          ))}
        </div>
      ) : news.error || (news.data?.data.length ?? 0) === 0 ? (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          {news.error
            ? "Could not load cricket news. Please try again shortly."
            : "No cricket news found."}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.data!.data.map((article, i) => (
              <NewsCard key={article.id} article={article} index={i} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-athletix-text-muted">Page {page}</span>
            <button
              type="button"
              disabled={!news.data?.hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
