"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Flame,
  History,
  ListOrdered,
  Radio,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroLive } from "@/components/dashboard/HeroLive";
import { LeagueTabs } from "@/components/dashboard/LeagueTabs";
import { MatchCard } from "@/components/dashboard/MatchCard";
import { NewsSection } from "@/components/dashboard/NewsSection";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { StandingsGroups } from "@/components/dashboard/StandingsGroups";
import { TopScorersList } from "@/components/dashboard/TopScorersList";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard, Skeleton } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import {
  FIFA_WORLD_CUP_ID,
  filterHomeMatches,
  football,
} from "@/lib/football";
import { todayISO } from "@/lib/format";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-10 text-center text-sm text-athletix-text-muted">
      {message}
    </div>
  );
}

export default function DashboardHome() {
  const [league, setLeague] = useState(FIFA_WORLD_CUP_ID);

  const live = useFetch(() => football.live(), []);
  const today = useFetch(() => football.fixtures(todayISO()), []);
  const wcUpcoming = useFetch(() => football.leagueUpcoming(FIFA_WORLD_CUP_ID, 8), []);
  const wcRecent = useFetch(() => football.leagueRecent(FIFA_WORLD_CUP_ID, 8), []);
  const standings = useFetch(() => football.standings(league), [league]);
  const scorers = useFetch(() => football.topScorers(league), [league]);

  const liveMatches = live.data ?? [];

  const wcLive = useMemo(
    () => liveMatches.filter((m) => m.league.id === FIFA_WORLD_CUP_ID),
    [liveMatches]
  );

  const heroMatch = useMemo(() => {
    if (wcLive[0]) return wcLive[0];
    if (wcUpcoming.data?.[0]) return wcUpcoming.data[0];
    if (wcRecent.data?.[0]) return wcRecent.data[0];
    return null;
  }, [wcLive, wcUpcoming.data, wcRecent.data]);

  const todayHomeMatches = useMemo(
    () => filterHomeMatches(today.data ?? []).slice(0, 8),
    [today.data]
  );

  const heroLoading = live.loading || wcUpcoming.loading;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        {/* FIFA World Cup hero */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              FIFA World Cup
            </h1>
            <p className="text-sm text-athletix-text-muted">
              Live tournament scores, upcoming fixtures, and results from the world&apos;s biggest stage.
            </p>
          </motion.div>

          {heroLoading ? (
            <Skeleton className="h-44 w-full rounded-3xl" />
          ) : heroMatch ? (
            <HeroLive match={heroMatch} />
          ) : (
            <EmptyState message="No FIFA World Cup matches to feature right now." />
          )}
        </section>

        {/* Recent World Cup results */}
        <section>
          <SectionHeader title="Recent Results" icon={<History className="h-5 w-5" />} />
          {wcRecent.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (wcRecent.data?.length ?? 0) > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {wcRecent.data!.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState message="No completed World Cup matches yet." />
          )}
        </section>

        {/* Live matches — all competitions */}
        <section>
          <SectionHeader
            title="Live Matches"
            icon={<Radio className="h-5 w-5" />}
            action={
              <Link
                href="/dashboard/live"
                className="text-xs font-medium text-athletix-primary hover:text-blue-400"
              >
                View all
              </Link>
            }
          />
          {live.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : liveMatches.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {liveMatches.slice(0, 6).map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState message="No matches are live at the moment." />
          )}
        </section>

        {/* Upcoming World Cup fixtures */}
        <section>
          <SectionHeader
            title="Upcoming World Cup Fixtures"
            icon={<Trophy className="h-5 w-5" />}
            action={
              <Link
                href={`/dashboard/competitions/${FIFA_WORLD_CUP_ID}`}
                className="text-xs font-medium text-athletix-primary hover:text-blue-400"
              >
                View tournament
              </Link>
            }
          />
          {wcUpcoming.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (wcUpcoming.data?.length ?? 0) > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {wcUpcoming.data!.slice(heroMatch ? 1 : 0, 7).map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState message="No upcoming World Cup fixtures scheduled." />
          )}
        </section>

        {/* Today's top-league & European fixtures */}
        <section>
          <SectionHeader title="Today's Matches" icon={<CalendarDays className="h-5 w-5" />} />
          <p className="mb-4 text-xs text-athletix-text-muted">
            Top 5 leagues, Champions League, and international football only.
          </p>
          {today.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : todayHomeMatches.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {todayHomeMatches.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState message="No matches today from featured competitions." />
          )}
        </section>

        {/* Standings */}
        <section>
          <SectionHeader title="Competition Tables" icon={<ListOrdered className="h-5 w-5" />} />
          <div className="mb-4">
            <LeagueTabs active={league} onChange={setLeague} />
          </div>
          {standings.loading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : (standings.data?.length ?? 0) > 0 ? (
            <StandingsGroups
              groups={standings.data!}
              limit={10}
              columns={league === FIFA_WORLD_CUP_ID ? 2 : 1}
            />
          ) : (
            <EmptyState message="Standings unavailable for this competition." />
          )}
        </section>

        {/* Top scorers */}
        <section>
          <SectionHeader title="Top Scorers" icon={<Flame className="h-5 w-5" />} />
          {scorers.loading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : (scorers.data?.length ?? 0) > 0 ? (
            <TopScorersList scorers={scorers.data!} limit={8} />
          ) : (
            <EmptyState message="Top scorers unavailable for this competition." />
          )}
        </section>

        {/* News */}
        <section>
          <NewsSection />
        </section>
      </div>

      <RightSidebar />
    </div>
  );
}
