"use client";

import { Crown, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FIFA_WORLD_CUP_ID, football } from "@/lib/football";
import { formatKickoff, formatMatchDate } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
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

export function RightSidebar() {
  const router = useRouter();
  const standings = useFetch(() => football.standings(FIFA_WORLD_CUP_ID), []);
  const scorers = useFetch(() => football.topScorers(FIFA_WORLD_CUP_ID), []);
  const upcoming = useFetch(() => football.leagueUpcoming(FIFA_WORLD_CUP_ID, 4), []);

  const leader = standings.data?.[0]?.rows?.[0];

  return (
    <aside className="sticky top-16 hidden h-fit w-80 shrink-0 flex-col gap-4 py-6 pr-6 xl:flex">
      <WidgetShell title="Group Leader" icon={<Crown className="h-4 w-4" />}>
        {standings.loading ? (
          <Skeleton className="h-12 w-full" />
        ) : leader ? (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/team/${leader.team.id}`)}
            className="flex w-full items-center gap-3 text-left"
          >
            <TeamLogo src={leader.team.logo} alt={leader.team.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{leader.team.name}</p>
              <p className="text-xs text-athletix-text-muted">
                {standings.data?.[0]?.name ?? "FIFA World Cup"} · {leader.points} pts
              </p>
            </div>
          </button>
        ) : (
          <p className="text-xs text-athletix-text-muted">Unavailable</p>
        )}
      </WidgetShell>

      <WidgetShell title="Upcoming World Cup" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="space-y-3">
          {upcoming.loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            upcoming.data?.slice(0, 4).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/dashboard/match/${m.id}`)}
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

      <WidgetShell title="World Cup Scorers" icon={<Flame className="h-4 w-4" />}>
        <div className="space-y-2.5">
          {scorers.loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            scorers.data?.slice(0, 5).map((s, i) => (
              <button
                key={s.player.id}
                type="button"
                onClick={() => router.push(`/dashboard/player/${s.player.id}`)}
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
          href={`/dashboard/competitions/${FIFA_WORLD_CUP_ID}`}
          className="mt-3 block text-center text-xs font-medium text-athletix-primary hover:text-blue-400"
        >
          View FIFA World Cup
        </Link>
      </WidgetShell>
    </aside>
  );
}
