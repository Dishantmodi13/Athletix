import type { NewsCategory } from "@/types/news";
import { getCategoryLabel, getCategoryStyle } from "@/lib/news";

interface NewsCategoryBadgeProps {
  category: NewsCategory;
  className?: string;
}

export function NewsCategoryBadge({ category, className = "" }: NewsCategoryBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${getCategoryStyle(category)} ${className}`}
    >
      {getCategoryLabel(category)}
    </span>
  );
}
