"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { isFinished, isLive, matchDetailRouteId, type Match } from "@/lib/football";
import { formatKickoff, formatMatchDate } from "@/lib/format";
import { LiveBadge } from "./LiveBadge";
import { TeamLogo } from "./ui/TeamLogo";

interface HeroLiveProps {
  match: Match;
}

function HeroTeam({
  name,
  logo,
  align,
}: {
  name: string;
  logo: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-3 ${
        align === "left" ? "sm:items-start" : "sm:items-end"
      }`}
    >
      <TeamLogo src={logo} alt={name} size={56} />
      <span className="text-center text-sm font-semibold text-white sm:text-base">
        {name}
      </span>
    </div>
  );
}

export function HeroLive({ match }: HeroLiveProps) {
  const router = useRouter();
  const live = isLive(match.status.short);
  const finished = isFinished(match.status.short);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      onClick={() => router.push(`/dashboard/match/${matchDetailRouteId(match)}`)}
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] p-6 text-left sm:p-8"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.2) 0%, transparent 60%), linear-gradient(180deg, rgba(17,17,17,0.9) 0%, rgba(5,5,5,0.95) 100%)",
        }}
      />
      <div className="relative">
        <div className="mb-6 flex items-center justify-center gap-2">
          <TeamLogo src={match.league.logo} alt={match.league.name} size={18} />
          <span className="text-xs font-medium text-athletix-text-muted">
            {match.league.name}
            {match.league.round ? ` · ${match.league.round}` : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <HeroTeam name={match.teams.home.name} logo={match.teams.home.logo} align="left" />

          <div className="flex flex-col items-center gap-2">
            {live || finished ? (
              <div className="flex items-center gap-3 text-3xl font-bold tabular-nums text-white sm:text-5xl">
                <span>{match.goals.home ?? 0}</span>
                <span className="text-athletix-text-muted">:</span>
                <span>{match.goals.away ?? 0}</span>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-athletix-text-secondary">Kickoff</p>
                <p className="text-lg font-bold text-white sm:text-xl">
                  {formatKickoff(match.date)}
                </p>
              </div>
            )}

            {live ? (
              <LiveBadge elapsed={match.status.elapsed} />
            ) : finished ? (
              <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-athletix-text-muted">
                Full Time
              </span>
            ) : (
              <span className="text-[11px] font-medium text-athletix-text-muted">
                {formatMatchDate(match.date)}
              </span>
            )}
          </div>

          <HeroTeam name={match.teams.away.name} logo={match.teams.away.logo} align="right" />
        </div>
      </div>
    </motion.button>
  );
}
