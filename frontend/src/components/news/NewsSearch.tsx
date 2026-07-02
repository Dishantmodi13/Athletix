"use client";

import { Search, X } from "lucide-react";

interface NewsSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function NewsSearch({ value, onChange }: NewsSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-athletix-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search headlines, clubs, players…"
        className="auth-glass-card w-full rounded-2xl border-white/[0.06] bg-white/[0.03] py-3 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder:text-athletix-text-muted focus:border-athletix-primary/40 focus:ring-2 focus:ring-athletix-primary/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-athletix-text-muted hover:text-white"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
