"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { isFinished, isLive, type Match } from "@/lib/football";
import { formatKickoff, formatMatchDate } from "@/lib/format";
import { LiveBadge } from "./LiveBadge";
import { TeamLogo } from "./ui/TeamLogo";

interface MatchCardProps {
  match: Match;
  index?: number;
}

function TeamRow({
  name,
  logo,
  score,
  winner,
}: {
  name: string;
  logo: string;
  score: number | null;
  winner: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo src={logo} alt={name} size={24} />
        <span
          className={`truncate text-sm ${winner ? "font-semibold text-white" : "text-athletix-text-secondary"}`}
        >
          {name}
        </span>
      </div>
      {score !== null && (
        <span
          className={`text-sm tabular-nums ${winner ? "font-bold text-white" : "text-athletix-text-secondary"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function MatchCard({ match, index = 0 }: MatchCardProps) {
  const router = useRouter();
  const live = isLive(match.status.short);
  const finished = isFinished(match.status.short);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -3 }}
      onClick={() => router.push(`/dashboard/match/${match.id}`)}
      className="auth-glass-card group w-full rounded-2xl p-4 text-left transition-all duration-300 hover:border-athletix-primary/30 hover:shadow-[0_0_30px_-12px_rgba(59,130,246,0.4)]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamLogo src={match.league.logo} alt={match.league.name} size={16} />
          <span className="truncate text-xs text-athletix-text-muted">
            {match.league.name}
          </span>
        </div>
        {live ? (
          <LiveBadge elapsed={match.status.elapsed} />
        ) : finished ? (
          <span className="text-[11px] font-medium text-athletix-text-muted">
            {formatMatchDate(match.date)} · FT
          </span>
        ) : (
          <span className="text-[11px] font-medium text-athletix-text-muted">
            {formatMatchDate(match.date)} · {formatKickoff(match.date)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <TeamRow
          name={match.teams.home.name}
          logo={match.teams.home.logo}
          score={match.goals.home}
          winner={match.teams.home.winner}
        />
        <TeamRow
          name={match.teams.away.name}
          logo={match.teams.away.logo}
          score={match.goals.away}
          winner={match.teams.away.winner}
        />
      </div>
    </motion.button>
  );
}
