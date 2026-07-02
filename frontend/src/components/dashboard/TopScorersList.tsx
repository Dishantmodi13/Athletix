"use client";

import { useRouter } from "next/navigation";
import type { TopScorer } from "@/lib/football";
import { PlayerAvatar } from "./ui/PlayerAvatar";
import { TeamLogo } from "./ui/TeamLogo";

interface TopScorersListProps {
  scorers: TopScorer[];
  limit?: number;
  metric?: "goals" | "assists";
}

export function TopScorersList({
  scorers,
  limit = 10,
  metric = "goals",
}: TopScorersListProps) {
  const router = useRouter();
  const data = scorers.slice(0, limit);

  return (
    <div className="auth-glass-card divide-y divide-white/[0.04] overflow-hidden rounded-2xl">
      {data.map((scorer, i) => {
        const stat = scorer.statistics[0];
        const value =
          metric === "goals" ? stat?.goals.total : stat?.goals.assists;
        return (
          <button
            key={`${scorer.player.id}-${i}`}
            type="button"
            onClick={() => router.push(`/dashboard/player/${scorer.player.id}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="w-5 text-center text-sm font-semibold text-athletix-text-muted">
              {i + 1}
            </span>
            <PlayerAvatar src={scorer.player.photo} name={scorer.player.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{scorer.player.name}</p>
              <div className="flex items-center gap-1.5">
                <TeamLogo src={stat?.team.logo ?? ""} alt={stat?.team.name ?? ""} size={14} />
                <span className="truncate text-xs text-athletix-text-muted">
                  {stat?.team.name}
                </span>
              </div>
            </div>
            <span className="text-lg font-bold tabular-nums text-athletix-primary">
              {value ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
