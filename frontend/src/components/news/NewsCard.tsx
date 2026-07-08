"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { memo } from "react";
import { NewsCategoryBadge } from "./NewsCategory";
import type { NewsArticle } from "@/types/news";
import { formatNewsTime, getNewsImageSrc, getPlaceholderImage } from "@/lib/news";

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
  featured?: boolean;
}

export const NewsCard = memo(function NewsCard({
  article,
  index = 0,
  featured = false,
}: NewsCardProps) {
  const imageSrc = getNewsImageSrc(article.image, article.id);
  const fallbackSrc = `/api/news/image?url=${encodeURIComponent(getPlaceholderImage(article.id))}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.35) }}
      className={`auth-glass-card group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:border-athletix-primary/35 hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.45)] ${
        featured ? "sm:col-span-2 lg:col-span-2" : ""
      }`}
    >
      <div className={`relative overflow-hidden ${featured ? "h-56 sm:h-64" : "h-44"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackSrc) {
              e.currentTarget.src = fallbackSrc;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-3 top-3">
          <NewsCategoryBadge category={article.category} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-athletix-text-muted">
          <span className="truncate font-medium text-athletix-text-secondary">{article.source}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatNewsTime(article.publishedAt)}
          </span>
        </div>

        <h3
          className={`mb-2 font-bold leading-snug text-white transition-colors group-hover:text-athletix-primary ${
            featured ? "text-lg sm:text-xl" : "text-sm sm:text-base"
          }`}
        >
          {article.title}
        </h3>

        {article.description && (
          <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-athletix-text-muted sm:text-sm">
            {article.description}
          </p>
        )}

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-athletix-primary/15 px-3.5 py-2 text-xs font-semibold text-athletix-primary ring-1 ring-inset ring-athletix-primary/25 transition-all hover:bg-athletix-primary/25"
        >
          Read More
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </motion.article>
  );
});
