"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { cricketMatchRoute, type CricketMatch, type CricketTeamScore } from "@/lib/cricket";
import { matchFormatDisplay, matchFormatStyle } from "@/lib/cricketFormat";
import { formatKickoff, formatMatchDate } from "@/lib/format";

function CricketLiveBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      {label || "LIVE"}
    </span>
  );
}

function TeamRow({ team }: { team: CricketTeamScore }) {
  const emphasized = team.winner === true;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo src={team.logo} alt={team.name} size={24} />
        <span
          className={`truncate text-sm ${emphasized ? "font-semibold text-white" : "text-athletix-text-secondary"}`}
        >
          {team.name}
        </span>
      </div>
      {team.score && (
        <span
          className={`shrink-0 text-xs tabular-nums sm:text-sm ${
            emphasized ? "font-bold text-white" : "text-athletix-text-secondary"
          }`}
        >
          {team.score}
        </span>
      )}
    </div>
  );
}

interface CricketMatchCardProps {
  match: CricketMatch;
  index?: number;
}

export function CricketMatchCard({ match, index = 0 }: CricketMatchCardProps) {
  const router = useRouter();
  const live = match.state === "live";
  const finished = match.state === "finished";
  const formatText = matchFormatDisplay(match);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -3 }}
      onClick={() => router.push(cricketMatchRoute(match))}
      className="auth-glass-card group w-full rounded-2xl p-4 text-left transition-all duration-300 hover:border-athletix-primary/30 hover:shadow-[0_0_30px_-12px_rgba(59,130,246,0.4)]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {formatText && (
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${matchFormatStyle(match.format)}`}
            >
              {formatText}
            </span>
          )}
          <span className="truncate text-xs text-athletix-text-muted">{match.series}</span>
        </div>
        {live ? (
          <CricketLiveBadge label={match.statusText === "Live" ? "LIVE" : match.statusText} />
        ) : finished ? (
          <span className="shrink-0 text-[11px] font-medium text-athletix-text-muted">
            {formatMatchDate(match.date)} · {match.statusText || "Result"}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-medium text-athletix-text-muted">
            {formatMatchDate(match.date)} · {formatKickoff(match.date)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {match.teams.map((team, i) => (
          <TeamRow key={`${team.id}-${i}`} team={team} />
        ))}
      </div>

      {match.note && (
        <p className="mt-3 truncate border-t border-white/[0.06] pt-2.5 text-[11px] text-athletix-text-muted">
          {match.note}
        </p>
      )}
    </motion.button>
  );
}
