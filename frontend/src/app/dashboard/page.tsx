"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Flame,
  Heart,
  History,
  ListOrdered,
  Radio,
  Trophy,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroLive } from "@/components/dashboard/HeroLive";
import { LeagueTabs } from "@/components/dashboard/LeagueTabs";
import { MatchCard } from "@/components/dashboard/MatchCard";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { StandingsGroups } from "@/components/dashboard/StandingsGroups";
import { TopScorersList } from "@/components/dashboard/TopScorersList";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard, Skeleton } from "@/components/dashboard/ui/Skeleton";
import { useFollowedTeams } from "@/hooks/useFollowedTeams";
import { useFetch } from "@/hooks/useFetch";
import {
  FIFA_WORLD_CUP_ID,
  dedupeMatches,
  filterFollowedMatches,
  filterHomeMatches,
  football,
  getDefaultHomeLeagueId,
  isTopLeagueMatch,
  isWorldCupFocusActive,
  sortMatchesFollowedFirst,
  type Match,
} from "@/lib/football";

const NewsSection = dynamic(
  () => import("@/components/dashboard/NewsSection").then((m) => m.NewsSection),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-2xl" />,
  }
);

function EmptyState({ message }: { message: string }) {
  return (
    <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-10 text-center text-sm text-athletix-text-muted">
      {message}
    </div>
  );
}

function MatchGrid({ matches }: { matches: Match[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.map((m, i) => (
        <MatchCard key={m.id} match={m} index={i} />
      ))}
    </div>
  );
}

export default function DashboardHome() {
  const worldCupFocus = isWorldCupFocusActive();
  const [league, setLeague] = useState(() => getDefaultHomeLeagueId());
  const { teams } = useFollowedTeams();

  const home = useFetch(() => football.home(), []);
  const followedTeamMatches = useFetch(
    () => football.followedMatches(teams),
    [teams.map((team) => `${team.id}:${team.name}`).join("|")],
    teams.length > 0
  );
  const bundledLeague = home.data?.defaultLeague ?? league;
  const useBundledTables = Boolean(home.data && league === bundledLeague);

  const standings = useFetch(
    () => football.standings(league),
    [league],
    !useBundledTables && !home.loading
  );
  const scorers = useFetch(
    () => football.topScorers(league),
    [league],
    !useBundledTables && !home.loading
  );

  const liveMatches = home.data?.live ?? [];
  const todayMatches = home.data?.today ?? [];
  const featuredUpcoming = home.data?.featuredUpcoming ?? [];
  const featuredRecent = home.data?.featuredRecent ?? [];
  const standingsData = useBundledTables ? home.data?.standings : standings.data;
  const scorersData = useBundledTables ? home.data?.scorers : scorers.data;
  const standingsLoading = useBundledTables ? home.loading : standings.loading;
  const scorersLoading = useBundledTables ? home.loading : scorers.loading;

  const wcLive = useMemo(
    () => liveMatches.filter((m) => m.league.id === FIFA_WORLD_CUP_ID),
    [liveMatches]
  );

  const topLive = useMemo(
    () => liveMatches.filter((m) => isTopLeagueMatch(m)),
    [liveMatches]
  );

  const featuredLive = worldCupFocus ? wcLive : topLive;

  const heroMatch = useMemo(() => {
    const followedLive = filterFollowedMatches(liveMatches, teams);
    if (followedLive[0]) return followedLive[0];
    if (featuredLive[0]) return featuredLive[0];
    if (featuredUpcoming[0]) return featuredUpcoming[0];
    if (featuredRecent[0]) return featuredRecent[0];
    return null;
  }, [featuredLive, featuredRecent, featuredUpcoming, liveMatches, teams]);

  const followedMatches = useMemo(
    () => dedupeMatches(followedTeamMatches.data ?? []),
    [followedTeamMatches.data]
  );

  const todayHomeMatches = useMemo(() => {
    const matches = filterHomeMatches(todayMatches);
    const scoped = worldCupFocus
      ? matches
      : matches.filter((match) => isTopLeagueMatch(match) || match.league.id === 2);
    return sortMatchesFollowedFirst(scoped, teams).slice(0, 8);
  }, [teams, todayMatches, worldCupFocus]);

  const sortedLiveMatches = useMemo(
    () => sortMatchesFollowedFirst(liveMatches, teams).slice(0, 6),
    [liveMatches, teams]
  );

  const heroLoading = home.loading;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        {teams.length > 0 && (
          <section>
            <SectionHeader title="Your Teams" icon={<Heart className="h-5 w-5" />} />
            <p className="mb-4 text-xs text-athletix-text-muted">
              Matches for teams you follow are prioritized across your home feed.
            </p>
            {home.loading || followedTeamMatches.loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : followedMatches.length > 0 ? (
              <MatchGrid matches={followedMatches} />
            ) : (
              <EmptyState message="No upcoming or live matches for your followed teams right now." />
            )}
          </section>
        )}

        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {worldCupFocus ? "FIFA World Cup" : "Top Leagues"}
            </h1>
            <p className="text-sm text-athletix-text-muted">
              {worldCupFocus
                ? "Live tournament scores, upcoming fixtures, and results from the world's biggest stage."
                : "Live scores and fixtures from the Premier League, La Liga, Serie A, Bundesliga, and Ligue 1."}
            </p>
          </motion.div>

          {heroLoading ? (
            <Skeleton className="h-44 w-full rounded-3xl" />
          ) : heroMatch ? (
            <HeroLive match={heroMatch} />
          ) : (
            <EmptyState
              message={
                worldCupFocus
                  ? "No FIFA World Cup matches to feature right now."
                  : "No top-league matches to feature right now."
              }
            />
          )}
        </section>

        <section>
          <SectionHeader title="Recent Results" icon={<History className="h-5 w-5" />} />
          {home.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : featuredRecent.length > 0 ? (
            <MatchGrid matches={featuredRecent} />
          ) : (
            <EmptyState
              message={
                worldCupFocus
                  ? "No completed World Cup matches yet."
                  : "No recent matches from the top leagues."
              }
            />
          )}
        </section>

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
          {home.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : sortedLiveMatches.length > 0 ? (
            <MatchGrid matches={sortedLiveMatches} />
          ) : (
            <EmptyState message="No matches are live at the moment." />
          )}
        </section>

        <section>
          <SectionHeader
            title={worldCupFocus ? "Upcoming World Cup Fixtures" : "Upcoming Top League Fixtures"}
            icon={<Trophy className="h-5 w-5" />}
            action={
              worldCupFocus ? (
                <Link
                  href={`/dashboard/competitions/${FIFA_WORLD_CUP_ID}`}
                  className="text-xs font-medium text-athletix-primary hover:text-blue-400"
                >
                  View tournament
                </Link>
              ) : (
                <Link
                  href="/dashboard/fixtures"
                  className="text-xs font-medium text-athletix-primary hover:text-blue-400"
                >
                  View fixtures
                </Link>
              )
            }
          />
          {home.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : featuredUpcoming.length > 0 ? (
            <MatchGrid matches={featuredUpcoming.slice(heroMatch ? 1 : 0, 7)} />
          ) : (
            <EmptyState
              message={
                worldCupFocus
                  ? "No upcoming World Cup fixtures scheduled."
                  : "No upcoming top-league fixtures scheduled."
              }
            />
          )}
        </section>

        <section>
          <SectionHeader title="Today's Matches" icon={<CalendarDays className="h-5 w-5" />} />
          <p className="mb-4 text-xs text-athletix-text-muted">
            {worldCupFocus
              ? "Top 5 leagues, Champions League, and international football. Your followed teams appear first."
              : "Top 5 leagues and Champions League. Your followed teams appear first."}
          </p>
          {home.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : todayHomeMatches.length > 0 ? (
            <MatchGrid matches={todayHomeMatches} />
          ) : (
            <EmptyState message="No matches today from featured competitions." />
          )}
        </section>

        <section>
          <SectionHeader title="Competition Tables" icon={<ListOrdered className="h-5 w-5" />} />
          <div className="mb-4">
            <LeagueTabs active={league} onChange={setLeague} worldCupFocus={worldCupFocus} />
          </div>
          {standingsLoading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : (standingsData?.length ?? 0) > 0 ? (
            <StandingsGroups
              groups={standingsData!}
              limit={10}
              columns={league === FIFA_WORLD_CUP_ID ? 2 : 1}
            />
          ) : (
            <EmptyState message="Standings unavailable for this competition." />
          )}
        </section>

        <section>
          <SectionHeader title="Top Scorers" icon={<Flame className="h-5 w-5" />} />
          {scorersLoading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : (scorersData?.length ?? 0) > 0 ? (
            <TopScorersList scorers={scorersData!} limit={8} />
          ) : (
            <EmptyState message="Top scorers unavailable for this competition." />
          )}
        </section>

        <section>
          <NewsSection />
        </section>
      </div>

      <RightSidebar
        worldCupFocus={worldCupFocus}
        upcoming={home.data?.sidebarUpcoming}
        scorers={home.data?.sidebarScorers}
        loading={home.loading}
      />
    </div>
  );
}
