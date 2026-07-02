"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { useNews } from "@/hooks/useNews";
import { NewsCarouselSkeleton, NewsSkeleton } from "./NewsSkeleton";
import type { NewsArticle, NewsCategory } from "@/types/news";
import { getCategoryMeta } from "@/lib/news";

const NewsCarousel = dynamic(
  () => import("./NewsCarousel").then((m) => m.NewsCarousel),
  { loading: () => <NewsCarouselSkeleton /> }
);

const NewsGrid = dynamic(() => import("./NewsGrid").then((m) => m.NewsGrid), {
  loading: () => <NewsSkeleton count={3} />,
});

function pickByCategory(articles: NewsArticle[], category: NewsCategory, limit: number) {
  return articles.filter((a) => a.category === category).slice(0, limit);
}

const HOME_SECTIONS: Array<{ category: NewsCategory; limit: number }> = [
  { category: "transfers", limit: 4 },
  { category: "premier-league", limit: 4 },
  { category: "champions-league", limit: 4 },
  { category: "players", limit: 4 },
  { category: "clubs", limit: 4 },
];

export function NewsHubHome() {
  const { articles, loading, error } = useNews({ limit: 60 });

  const breaking = articles.filter((a) => a.category === "breaking").slice(0, 6);
  const latest = articles.slice(0, 8);

  if (loading) {
    return (
      <div className="space-y-8">
        <NewsCarouselSkeleton />
        <NewsSkeleton count={6} />
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-12 text-center text-sm text-athletix-text-muted">
        No football news available at the moment.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Football News Hub"
        icon={<Newspaper className="h-5 w-5" />}
        action={
          <Link
            href="/dashboard/news"
            className="inline-flex items-center gap-1 text-xs font-semibold text-athletix-primary hover:text-blue-400"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {(breaking.length > 0 ? breaking : latest.slice(0, 4)).length > 0 && (
        <section>
          <NewsCarousel
            title={`${getCategoryMeta("breaking").emoji} Breaking News`}
            articles={breaking.length > 0 ? breaking : latest.slice(0, 4)}
          />
        </section>
      )}

      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
          ⚽ Latest News
        </h3>
        <NewsGrid articles={latest.slice(0, 6)} featuredFirst />
      </section>

      {HOME_SECTIONS.map(({ category, limit }) => {
        const sectionArticles = pickByCategory(articles, category, limit);
        if (sectionArticles.length === 0) return null;
        const meta = getCategoryMeta(category);
        return (
          <section key={category}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
              {meta.emoji} {meta.label}
            </h3>
            <NewsGrid articles={sectionArticles} />
          </section>
        );
      })}

      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard/news"
          className="inline-flex items-center gap-2 rounded-full bg-athletix-primary/15 px-6 py-3 text-sm font-semibold text-athletix-primary ring-1 ring-inset ring-athletix-primary/30 transition-all hover:bg-athletix-primary/25"
        >
          View All News
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
