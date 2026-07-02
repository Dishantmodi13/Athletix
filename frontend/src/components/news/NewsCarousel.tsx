"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useRef } from "react";
import { NewsCard } from "./NewsCard";
import type { NewsArticle } from "@/types/news";

interface NewsCarouselProps {
  articles: NewsArticle[];
  title?: string;
}

export const NewsCarousel = memo(function NewsCarousel({
  articles,
  title,
}: NewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -320 : 320;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (articles.length === 0) return null;

  return (
    <div>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
            {title}
          </h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="rounded-full bg-white/[0.05] p-1.5 text-athletix-text-muted transition-colors hover:text-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="rounded-full bg-white/[0.05] p-1.5 text-athletix-text-muted transition-colors hover:text-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {articles.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="w-[min(100%,320px)] shrink-0 sm:w-[320px]"
          >
            <NewsCard article={article} index={index} />
          </motion.div>
        ))}
      </div>
    </div>
  );
});
