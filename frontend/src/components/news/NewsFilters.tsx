"use client";

import type { NewsCategory } from "@/types/news";
import { NEWS_CATEGORIES } from "@/types/news";

interface NewsFiltersProps {
  active: NewsCategory | "all";
  onChange: (category: NewsCategory | "all") => void;
}

const FILTER_OPTIONS: Array<{ id: NewsCategory | "all"; label: string; emoji?: string }> = [
  { id: "all", label: "All" },
  { id: "latest", label: "Latest", emoji: "⚽" },
  ...NEWS_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
];

export function NewsFilters({ active, onChange }: NewsFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            active === option.id
              ? "bg-athletix-primary/20 text-athletix-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
              : "bg-white/[0.03] text-athletix-text-muted hover:text-white"
          }`}
        >
          {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
}
