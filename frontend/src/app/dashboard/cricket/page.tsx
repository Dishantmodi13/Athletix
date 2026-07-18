"use client";

import { Flame, Radio, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CricketMatchCard } from "@/components/cricket/CricketMatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { cricket, type CricketMatch, type CricketSeries } from "@/lib/cricket";

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-12 text-center text-sm text-athletix-text-muted">
      {message}
    </div>
  );
}

function MatchGrid({ matches }: { matches: CricketMatch[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m, i) => (
        <CricketMatchCard key={`${m.leagueId}-${m.id}`} match={m} index={i} />
      ))}
    </div>
  );
}

function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Show the full schedule for an ongoing series. */
function seriesDisplayMatches(matches: CricketMatch[]): CricketMatch[] {
  const hasActive = matches.some((m) => m.state === "live" || m.state === "upcoming");
  if (hasActive) return matches;

  const now = Date.now();
  const recentCutoff = 14 * 86_400_000;
  return matches.filter((m) => {
    if (m.state !== "finished") return true;
    return now - new Date(m.date).getTime() <= recentCutoff;
  });
}

function SeriesBlock({ series }: { series: CricketSeries }) {
  const displayMatches = useMemo(() => seriesDisplayMatches(series.matches), [series.matches]);
  const liveCount = displayMatches.filter((m) => m.state === "live").length;
  const upcomingCount = displayMatches.filter((m) => m.state === "upcoming").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{series.name}</h3>
        {liveCount > 0 && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            {liveCount} live
          </span>
        )}
        {upcomingCount > 0 && (
          <span className="rounded-full bg-athletix-primary/15 px-2 py-0.5 text-[10px] font-medium text-athletix-primary">
            {upcomingCount} upcoming
          </span>
        )}
      </div>
      <MatchGrid matches={displayMatches} />
    </div>
  );
}

export default function CricketDashboardPage() {
  const home = useFetch(() => cricket.home(), []);

  const liveMatches = home.data?.live ?? [];
  const featuredSeries = home.data?.featured ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Cricket</h1>
        <p className="mt-1 text-sm text-athletix-text-muted">
          Live scores and ongoing series for India, England, Australia, Pakistan, and more.
        </p>
      </div>

      <section>
        <SectionHeader
          title="Live Now"
          icon={<Radio className="h-5 w-5" />}
          action={
            <Link
              href="/dashboard/cricket/live"
              className="text-xs font-medium text-athletix-primary hover:underline"
            >
              View all
            </Link>
          }
        />
        {home.loading ? (
          <LoadingGrid count={3} />
        ) : liveMatches.length > 0 ? (
          <MatchGrid matches={liveMatches} />
        ) : (
          <EmptyCard message="No matches are live right now — check the ongoing series below." />
        )}
      </section>

      <section>
        <SectionHeader
          title="Ongoing Series"
          icon={<Flame className="h-5 w-5" />}
          action={
            <Link
              href="/dashboard/cricket/fixtures"
              className="text-xs font-medium text-athletix-primary hover:underline"
            >
              All fixtures
            </Link>
          }
        />
        {home.loading ? (
          <LoadingGrid />
        ) : home.error ? (
          <EmptyCard message="Could not load cricket data. Please try again shortly." />
        ) : featuredSeries.length > 0 ? (
          <div className="space-y-10">
            {featuredSeries.map((series) => (
              <SeriesBlock key={series.leagueId} series={series} />
            ))}
          </div>
        ) : (
          <EmptyCard message="No major international series are in action right now." />
        )}
      </section>

      <section>
        <SectionHeader title="Explore Competitions" icon={<Trophy className="h-5 w-5" />} />
        <Link
          href="/dashboard/cricket/competitions"
          className="auth-glass-card block rounded-2xl p-5 transition-all duration-300 hover:border-athletix-primary/30"
        >
          <p className="text-sm font-semibold text-white">
            ICC tournaments, IPL &amp; Big Bash League
          </p>
          <p className="mt-1 text-xs leading-relaxed text-athletix-text-muted">
            Browse every major cricket competition, from the World Cup and Champions Trophy to
            franchise leagues.
          </p>
        </Link>
      </section>
    </div>
  );
}
