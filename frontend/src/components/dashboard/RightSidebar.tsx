"use client";

import { Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FIFA_WORLD_CUP_ID,
  TOP_FIVE_LEAGUE_IDS,
  matchDetailRouteId,
  playerRoute,
  type Match,
  type TopScorer,
} from "@/lib/football";
import { formatKickoff, formatMatchDate } from "@/lib/format";
import { Skeleton } from "./ui/Skeleton";
import { PlayerAvatar } from "./ui/PlayerAvatar";
import { TeamLogo } from "./ui/TeamLogo";

function WidgetShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-glass-card rounded-2xl p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-athletix-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

interface RightSidebarProps {
  worldCupFocus?: boolean;
  upcoming?: Match[];
  scorers?: TopScorer[];
  loading?: boolean;
}

export function RightSidebar({
  worldCupFocus = true,
  upcoming,
  scorers,
  loading = false,
}: RightSidebarProps) {
  const router = useRouter();

  return (
    <aside className="sticky top-16 hidden h-fit w-80 shrink-0 flex-col gap-4 py-6 pr-6 xl:flex">
      <WidgetShell
        title={worldCupFocus ? "Upcoming World Cup" : "Upcoming Top Leagues"}
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <div className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            upcoming?.slice(0, 4).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/dashboard/match/${matchDetailRouteId(m)}`)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <TeamLogo src={m.teams.home.logo} alt={m.teams.home.name} size={18} />
                  <span className="truncate text-xs text-athletix-text-secondary">
                    {m.teams.home.name}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] text-athletix-text-muted">
                  {formatMatchDate(m.date)} {formatKickoff(m.date)}
                </span>
                <div className="flex min-w-0 items-center justify-end gap-1.5">
                  <span className="truncate text-xs text-athletix-text-secondary">
                    {m.teams.away.name}
                  </span>
                  <TeamLogo src={m.teams.away.logo} alt={m.teams.away.name} size={18} />
                </div>
              </button>
            ))
          )}
        </div>
      </WidgetShell>

      <WidgetShell
        title={worldCupFocus ? "World Cup Scorers" : "Premier League Scorers"}
        icon={<Flame className="h-4 w-4" />}
      >
        <div className="space-y-2.5">
          {loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            scorers?.slice(0, 5).map((s, i) => (
              <button
                key={s.player.id}
                type="button"
                onClick={() => router.push(playerRoute(s.player.id, s.player.name))}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span className="w-4 text-xs font-semibold text-athletix-text-muted">{i + 1}</span>
                <PlayerAvatar src={s.player.photo} name={s.player.name} size={28} />
                <span className="min-w-0 flex-1 truncate text-xs text-white">{s.player.name}</span>
                <span className="text-sm font-bold text-athletix-primary">
                  {s.statistics[0]?.goals.total ?? 0}
                </span>
              </button>
            ))
          )}
        </div>
        <Link
          href={
            worldCupFocus
              ? `/dashboard/competitions/${FIFA_WORLD_CUP_ID}`
              : `/dashboard/competitions/${TOP_FIVE_LEAGUE_IDS[0]}`
          }
          className="mt-3 block text-center text-xs font-medium text-athletix-primary hover:text-blue-400"
        >
          {worldCupFocus ? "View FIFA World Cup" : "View Premier League"}
        </Link>
      </WidgetShell>
    </aside>
  );
}
