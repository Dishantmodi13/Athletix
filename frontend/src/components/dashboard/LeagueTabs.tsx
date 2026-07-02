"use client";

import { HOME_COMPETITIONS } from "@/lib/football";

interface LeagueTabsProps {
  active: number;
  onChange: (id: number) => void;
}

export function LeagueTabs({ active, onChange }: LeagueTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {HOME_COMPETITIONS.map((league) => (
        <button
          key={league.id}
          type="button"
          onClick={() => onChange(league.id)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
            active === league.id
              ? "bg-athletix-primary/20 text-athletix-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
              : "bg-white/[0.03] text-athletix-text-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          {league.name}
        </button>
      ))}
    </div>
  );
}
