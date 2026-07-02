"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NewsApiResponse, NewsArticle, NewsCategory } from "@/types/news";

interface UseNewsOptions {
  category?: NewsCategory | "all";
  search?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseNewsState {
  articles: NewsArticle[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  refetch: () => void;
  loadMore: () => void;
}

async function fetchNewsPage(params: {
  category?: NewsCategory | "all";
  search?: string;
  page: number;
  limit: number;
}): Promise<NewsApiResponse> {
  const query = new URLSearchParams();
  if (params.category && params.category !== "all") {
    query.set("category", params.category);
  }
  if (params.search?.trim()) {
    query.set("q", params.search.trim());
  }
  query.set("page", String(params.page));
  query.set("limit", String(params.limit));

  const res = await fetch(`/api/news?${query.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to load news");
  }

  return (await res.json()) as NewsApiResponse;
}

export function useNews(options: UseNewsOptions = {}): UseNewsState {
  const { category = "all", search = "", limit = 20, enabled = true } = options;
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [nonce, setNonce] = useState(0);

  const searchKey = useMemo(() => search.trim().toLowerCase(), [search]);

  const refetch = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setPage(1);

    fetchNewsPage({ category, search: searchKey, page: 1, limit })
      .then((result) => {
        if (!active) return;
        setArticles(result.data);
        setHasMore(result.hasMore);
        setTotal(result.total);
        if (!result.success && result.data.length === 0) {
          setError("No football news available at the moment.");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setArticles([]);
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, searchKey, limit, enabled, nonce]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    fetchNewsPage({ category, search: searchKey, page: nextPage, limit })
      .then((result) => {
        setArticles((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          const merged = [...prev];
          for (const article of result.data) {
            if (!seen.has(article.id)) merged.push(article);
          }
          return merged;
        });
        setHasMore(result.hasMore);
        setTotal(result.total);
        setPage(nextPage);
      })
      .catch(() => {
        setError("Failed to load more articles");
      })
      .finally(() => setLoadingMore(false));
  }, [category, searchKey, limit, page, hasMore, loadingMore]);

  return {
    articles,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    refetch,
    loadMore,
  };
}
