"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { MatchCard } from "@/components/dashboard/MatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { football } from "@/lib/football";
import { offsetDateISO, formatFixtureDayLabel } from "@/lib/format";

export default function FixturesPage() {
  const [offset, setOffset] = useState(0);
  const date = useMemo(() => offsetDateISO(offset), [offset]);
  const fixtures = useFetch(() => football.fixtures(date), [date]);

  const label = useMemo(() => formatFixtureDayLabel(date), [date]);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Fixtures" icon={<CalendarDays className="h-5 w-5" />} />

      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.06]"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-white">{label}</span>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.06]"
        >
          Next →
        </button>
      </div>

      {fixtures.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (fixtures.data?.length ?? 0) > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fixtures.data!.map((m, i) => (
            <MatchCard key={m.id} match={m} index={i} />
          ))}
        </div>
      ) : (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          No fixtures scheduled for this day.
        </div>
      )}
    </div>
  );
}
