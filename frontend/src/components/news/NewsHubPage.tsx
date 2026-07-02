"use client";

import { useEffect, useRef, useState } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { useNews } from "@/hooks/useNews";
import { NewsFilters } from "./NewsFilters";
import { NewsGrid } from "./NewsGrid";
import { NewsSearch } from "./NewsSearch";
import { NewsSkeleton } from "./NewsSkeleton";
import type { NewsCategory } from "@/types/news";

export function NewsHubPage() {
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { articles, loading, loadingMore, error, hasMore, total, loadMore, refetch } = useNews({
    category,
    search: debouncedSearch,
    limit: 12,
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionHeader
        title="Football News Hub"
        icon={<Newspaper className="h-5 w-5" />}
        action={
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-athletix-text-muted transition-colors hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <p className="text-sm text-athletix-text-muted">
        Breaking stories, transfers, and matchday headlines from trusted sources — updated throughout the day.
      </p>

      <NewsSearch value={search} onChange={setSearch} />
      <NewsFilters active={category} onChange={setCategory} />

      {!loading && (
        <p className="text-xs text-athletix-text-muted">
          {total} article{total === 1 ? "" : "s"}
          {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
        </p>
      )}

      {loading ? (
        <NewsSkeleton count={9} />
      ) : error && articles.length === 0 ? (
        <div className="auth-glass-card flex flex-col items-center justify-center gap-3 rounded-2xl px-4 py-16 text-center">
          <p className="text-sm text-athletix-text-muted">
            No football news available at the moment.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-full bg-athletix-primary/15 px-4 py-2 text-xs font-semibold text-athletix-primary"
          >
            Try again
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          No articles match your filters.
        </div>
      ) : (
        <>
          <NewsGrid articles={articles} featuredFirst />
          <div ref={loadMoreRef} className="h-4" />
          {loadingMore && <NewsSkeleton count={3} />}
          {!hasMore && articles.length > 0 && (
            <p className="pb-8 text-center text-xs text-athletix-text-muted">
              You&apos;re all caught up.
            </p>
          )}
        </>
      )}
    </div>
  );
}
