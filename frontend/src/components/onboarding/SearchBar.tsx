"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div className="auth-input-glow relative rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-300 focus-within:border-athletix-primary/40">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-athletix-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-athletix-text-muted"
        aria-label={placeholder}
      />
    </div>
  );
}
