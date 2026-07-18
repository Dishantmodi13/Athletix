"use client";

import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayerOfTheMatchCard } from "@/components/dashboard/PlayerOfTheMatchCard";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { cricket, battingDismissalLabel, isAtCreaseBatter, type CricketInnings, type CricketMatchDetails } from "@/lib/cricket";
import { matchFormatDisplay, matchFormatStyle } from "@/lib/cricketFormat";
import { formatKickoff, formatMatchDate } from "@/lib/format";

const LIVE_REFRESH_MS = 30_000;

function LivePill({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      {label || "LIVE"}
    </span>
  );
}

function MatchHeader({ details }: { details: CricketMatchDetails }) {
  const match = details.match!;
  const live = match.state === "live";
  const formatText = matchFormatDisplay(match);

  return (
    <div className="auth-glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {formatText && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${matchFormatStyle(match.format)}`}
              >
                {formatText}
              </span>
            )}
            <p className="truncate text-xs font-medium text-athletix-text-muted">{match.series}</p>
          </div>
          {match.venue && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-athletix-text-muted">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </p>
          )}
        </div>
        {live ? (
          <LivePill label={match.statusText} />
        ) : (
          <span className="text-xs font-medium text-athletix-text-muted">
            {formatMatchDate(match.date)}
            {match.state === "upcoming" && ` · ${formatKickoff(match.date)}`}
            {match.state === "finished" && ` · ${match.statusText || "Result"}`}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {match.teams.map((team, i) => (
          <div key={`${team.id}-${i}`} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo src={team.logo} alt={team.name} size={36} />
              <span
                className={`truncate text-base sm:text-lg ${
                  team.winner ? "font-bold text-white" : "font-medium text-athletix-text-secondary"
                }`}
              >
                {team.name}
              </span>
            </div>
            <span
              className={`shrink-0 text-sm tabular-nums sm:text-base ${
                team.winner ? "font-bold text-white" : "text-athletix-text-secondary"
              }`}
            >
              {team.score || (match.state === "upcoming" ? "—" : "Yet to bat")}
            </span>
          </div>
        ))}
      </div>

      {match.note && (
        <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-athletix-text-muted">
          {match.note}
        </p>
      )}
    </div>
  );
}

function BattingTable({ innings }: { innings: CricketInnings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left text-[11px] uppercase tracking-wider text-athletix-text-muted">
            <th className="py-2 pr-2 font-medium">Batter</th>
            <th className="py-2 pr-2 font-medium" />
            <th className="py-2 pl-2 text-right font-medium">R</th>
            <th className="py-2 pl-2 text-right font-medium">B</th>
            <th className="py-2 pl-2 text-right font-medium">4s</th>
            <th className="py-2 pl-2 text-right font-medium">6s</th>
            <th className="py-2 pl-2 text-right font-medium">SR</th>
          </tr>
        </thead>
        <tbody>
          {innings.batting.map((line) => {
            const atCrease = isAtCreaseBatter(line);
            const dismissal = battingDismissalLabel(line);
            const retired = dismissal.toLowerCase().includes("retired");

            return (
            <tr key={`${line.order}-${line.name}`} className="border-b border-white/[0.04]">
              <td
                className={`py-2.5 pr-2 ${
                  atCrease ? "font-semibold text-white" : retired ? "text-athletix-text-secondary" : "text-athletix-text-secondary"
                }`}
              >
                {line.name}
                {atCrease && <span className="ml-1 text-athletix-primary">*</span>}
              </td>
              <td
                className={`max-w-[180px] truncate py-2.5 pr-2 text-xs ${
                  retired ? "font-medium text-amber-200/80" : "text-athletix-text-muted"
                }`}
              >
                {dismissal}
              </td>
              <td className="py-2.5 pl-2 text-right font-semibold tabular-nums text-white">
                {line.runs}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.balls}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.fours}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.sixes}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.strikeRate}
              </td>
            </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-2.5 pr-2 font-semibold text-white">Total</td>
            <td className="py-2.5 pr-2 text-xs text-athletix-text-muted">
              {innings.overs ? `${innings.overs} overs` : ""}
              {innings.target ? ` · target ${innings.target}` : ""}
            </td>
            <td className="py-2.5 pl-2 text-right font-bold tabular-nums text-white" colSpan={5}>
              {innings.runs}/{innings.wickets}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BowlingTable({ innings }: { innings: CricketInnings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left text-[11px] uppercase tracking-wider text-athletix-text-muted">
            <th className="py-2 pr-2 font-medium">Bowler</th>
            <th className="py-2 pl-2 text-right font-medium">O</th>
            <th className="py-2 pl-2 text-right font-medium">M</th>
            <th className="py-2 pl-2 text-right font-medium">R</th>
            <th className="py-2 pl-2 text-right font-medium">W</th>
            <th className="py-2 pl-2 text-right font-medium">Econ</th>
          </tr>
        </thead>
        <tbody>
          {innings.bowling.map((line) => (
            <tr key={`${line.order}-${line.name}`} className="border-b border-white/[0.04]">
              <td className="py-2.5 pr-2 text-athletix-text-secondary">{line.name}</td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.overs}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.maidens}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.conceded}
              </td>
              <td className="py-2.5 pl-2 text-right font-semibold tabular-nums text-white">
                {line.wickets}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-athletix-text-secondary">
                {line.economy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Scorecard({ innings }: { innings: CricketInnings[] }) {
  const [activeIndex, setActiveIndex] = useState(innings.length - 1);
  const active = innings[Math.min(activeIndex, innings.length - 1)];

  if (!active) return null;

  return (
    <div className="space-y-4">
      {innings.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {innings.map((inn, i) => (
            <button
              key={inn.title}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                i === activeIndex
                  ? "bg-athletix-primary/20 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
                  : "bg-white/[0.03] text-athletix-text-muted hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {inn.title}
            </button>
          ))}
        </div>
      )}

      <div className="auth-glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-white">{active.title}</h3>
          <span className="text-sm font-bold tabular-nums text-white">{active.score}</span>
        </div>
        <BattingTable innings={active} />
      </div>

      {active.bowling.length > 0 && (
        <div className="auth-glass-card rounded-2xl p-5">
          <h3 className="mb-3 text-sm font-bold text-white">
            Bowling — {active.bowlingTeam}
          </h3>
          <BowlingTable innings={active} />
        </div>
      )}
    </div>
  );
}

export default function CricketMatchPage() {
  const params = useParams<{ league: string; id: string }>();
  const leagueId = params.league;
  const eventId = params.id;

  const details = useFetch(
    () => cricket.matchDetails(leagueId, eventId),
    [leagueId, eventId]
  );

  const isLive = details.data?.match?.state === "live";

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => details.refetch(), LIVE_REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/cricket"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-athletix-text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Cricket
      </Link>

      {details.loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : details.error || !details.data?.match ? (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          Could not load this match. Please try again shortly.
        </div>
      ) : (
        <>
          <MatchHeader details={details.data} />

          {details.data.playerOfTheMatch && (
            <PlayerOfTheMatchCard
              potm={details.data.playerOfTheMatch}
              sport="cricket"
            />
          )}

          {details.data.innings.length > 0 ? (
            <Scorecard innings={details.data.innings} />
          ) : (
            <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-12 text-center text-sm text-athletix-text-muted">
              The full scorecard will appear once the match gets underway.
            </div>
          )}
        </>
      )}
    </div>
  );
}
