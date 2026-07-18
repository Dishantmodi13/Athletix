"use client";

import { Calendar } from "lucide-react";
import { useMemo } from "react";
import { CricketMatchCard } from "@/components/cricket/CricketMatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { cricket, type CricketMatch } from "@/lib/cricket";

export default function CricketFixturesPage() {
  const fixtures = useFetch(() => cricket.fixtures(), []);

  const grouped = useMemo(() => {
    const bySeries = new Map<string, CricketMatch[]>();
    for (const match of fixtures.data ?? []) {
      const list = bySeries.get(match.series) ?? [];
      list.push(match);
      bySeries.set(match.series, list);
    }
    return [...bySeries.entries()];
  }, [fixtures.data]);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Cricket Fixtures" icon={<Calendar className="h-5 w-5" />} />

      {fixtures.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : fixtures.error ? (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          Could not load fixtures. Please try again shortly.
        </div>
      ) : grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map(([series, matches]) => (
            <section key={series}>
              <h3 className="mb-3 text-sm font-semibold text-athletix-text-secondary">
                {series}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((m, i) => (
                  <CricketMatchCard key={`${m.leagueId}-${m.id}`} match={m} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          No upcoming fixtures found right now.
        </div>
      )}
    </div>
  );
}
