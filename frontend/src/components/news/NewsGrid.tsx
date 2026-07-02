"use client";

import { memo } from "react";
import { NewsCard } from "./NewsCard";
import type { NewsArticle } from "@/types/news";

interface NewsGridProps {
  articles: NewsArticle[];
  featuredFirst?: boolean;
}

export const NewsGrid = memo(function NewsGrid({
  articles,
  featuredFirst = false,
}: NewsGridProps) {
  if (articles.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => (
        <NewsCard
          key={article.id}
          article={article}
          index={index}
          featured={featuredFirst && index === 0}
        />
      ))}
    </div>
  );
});
