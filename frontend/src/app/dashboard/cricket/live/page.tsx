"use client";

import { Radio } from "lucide-react";
import { CricketMatchCard } from "@/components/cricket/CricketMatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { cricket } from "@/lib/cricket";

export default function CricketLivePage() {
  const live = useFetch(() => cricket.live(), []);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Live Cricket Scores" icon={<Radio className="h-5 w-5" />} />
      {live.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (live.data?.length ?? 0) > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {live.data!.map((m, i) => (
            <CricketMatchCard key={`${m.leagueId}-${m.id}`} match={m} index={i} />
          ))}
        </div>
      ) : (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          No cricket matches are live right now.
        </div>
      )}
    </div>
  );
}
