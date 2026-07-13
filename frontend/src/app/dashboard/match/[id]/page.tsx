"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LiveBadge } from "@/components/dashboard/LiveBadge";
import { MatchLineupList } from "@/components/dashboard/match/MatchLineupList";
import { MatchPitchLineup, resolveMatchLineups, type TeamLineup } from "@/components/dashboard/match/MatchPitchLineup";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import {
  football,
  isFinished,
  isLive,
  type MatchEvent,
  type MatchScoreSummary,
} from "@/lib/football";
import { formatKickoff, formatMatchDate } from "@/lib/format";
import { getFifaRank, isInternationalMatch } from "@/lib/fifaRankings";

interface StatEntry {
  type: string;
  value: number | string | null;
}
interface TeamStats {
  team: { id: number; name: string; logo: string };
  statistics: StatEntry[];
}

type Tab = "goals" | "stats" | "lineups" | "timeline";

function formatMinute(time: MatchEvent["time"]): string {
  if (time.extra) return `${time.elapsed}+${time.extra}'`;
  return `${time.elapsed}'`;
}

function namesMatch(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z]/g, "");
  return na.includes(nb) || nb.includes(na);
}

function statsForTeam(
  stats: TeamStats[],
  teamName: string,
  fallbackIndex: number
): StatEntry[] | undefined {
  const byName = stats.find((s) => namesMatch(s.team.name, teamName));
  return byName?.statistics ?? stats[fallbackIndex]?.statistics;
}

function statValue(stats: StatEntry[] | undefined, type: string): number {
  const raw = stats?.find((s) => s.type === type)?.value;
  if (typeof raw === "string") return parseFloat(raw) || 0;
  return raw ?? 0;
}

const STAT_LABELS: Record<string, string> = {
  "Ball Possession": "Possession",
  "Total Shots": "Shots",
  "Shots on Goal": "Shots on Target",
  "Corner Kicks": "Corners",
  "Yellow Cards": "Yellow Cards",
  "Red Cards": "Red Cards",
  "Goalkeeper Saves": "Saves",
  "Total passes": "Passes",
  "Passes accurate": "Accurate Passes",
  "Passes %": "Pass Accuracy",
  expected_goals: "Expected Goals (xG)",
  goals_prevented: "Goals Prevented",
};

const STAT_PRIORITY = [
  "Ball Possession",
  "Total Shots",
  "Shots on Goal",
  "Shots off Goal",
  "Blocked Shots",
  "Corner Kicks",
  "Fouls",
  "Offsides",
  "Yellow Cards",
  "Red Cards",
  "Goalkeeper Saves",
  "Total passes",
  "Passes accurate",
  "Passes %",
  "expected_goals",
  "goals_prevented",
  "Shots insidebox",
  "Shots outsidebox",
];

function statLabel(type: string): string {
  return STAT_LABELS[type] ?? type;
}

function isPercentStat(type: string): boolean {
  return type.includes("Possession") || type.includes("Passes %");
}

function hasStatValue(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return true;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed);
}

function buildStatRows(
  homeStats: StatEntry[] | undefined,
  awayStats: StatEntry[] | undefined
): Array<{ type: string; label: string; percent: boolean }> {
  const types = new Set<string>([
    ...(homeStats ?? []).map((s) => s.type),
    ...(awayStats ?? []).map((s) => s.type),
  ]);

  return [...types]
    .filter((type) => {
      const home = homeStats?.find((s) => s.type === type)?.value;
      const away = awayStats?.find((s) => s.type === type)?.value;
      return hasStatValue(home) || hasStatValue(away);
    })
    .sort((a, b) => {
      const ai = STAT_PRIORITY.indexOf(a);
      const bi = STAT_PRIORITY.indexOf(b);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      if (ar !== br) return ar - br;
      return a.localeCompare(b);
    })
    .map((type) => ({
      type,
      label: statLabel(type),
      percent: isPercentStat(type),
    }));
}

function StatBar({
  label,
  home,
  away,
  percent = false,
}: {
  label: string;
  home: number;
  away: number;
  percent?: boolean;
}) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;

  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums text-white">
          {home}
          {percent ? "%" : ""}
        </span>
        <span className="text-xs text-athletix-text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-white">
          {away}
          {percent ? "%" : ""}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="bg-athletix-primary"
          initial={{ width: 0 }}
          animate={{ width: `${homePct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <div className="flex-1 bg-athletix-secondary/60" />
      </div>
    </div>
  );
}

function ScoreSummaryRow({ rows }: { rows: MatchScoreSummary[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-athletix-text-muted"
        >
          <span className="font-medium text-white/70">{row.label}</span>{" "}
          <span className="tabular-nums text-white">
            {row.home ?? 0} - {row.away ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}

function displayScore(
  goals: { home: number | null; away: number | null },
  scoreSummary: MatchScoreSummary[],
  statusShort: string
): { home: number; away: number; pens?: MatchScoreSummary } {
  const pens = scoreSummary.find((r) => r.label === "Penalties");

  return {
    home: goals.home ?? 0,
    away: goals.away ?? 0,
    pens:
      pens && (statusShort === "PEN" || pens.home != null || pens.away != null)
        ? pens
        : undefined,
  };
}

function GoalRow({ event, index }: { event: MatchEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
    >
      <span className="w-12 shrink-0 text-center text-sm font-bold tabular-nums text-athletix-primary">
        {formatMinute(event.time)}
      </span>
      <TeamLogo src={event.team.logo ?? ""} alt={event.team.name} size={24} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{event.player.name}</p>
        <p className="truncate text-xs text-athletix-text-muted">
          {event.detail}
          {event.assist.name ? ` · Assist: ${event.assist.name}` : ""}
        </p>
      </div>
      {event.score && (
        <span className="shrink-0 text-sm font-bold tabular-nums text-white">
          {event.score.home} - {event.score.away}
        </span>
      )}
    </motion.div>
  );
}

function EventRow({ event, index }: { event: MatchEvent; index: number }) {
  const icon =
    event.type === "Goal"
      ? "⚽"
      : event.type === "Card"
        ? event.detail.includes("Red")
          ? "🟥"
          : "🟨"
        : event.type === "subst"
          ? "🔁"
          : "•";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 text-sm"
    >
      <span className="w-12 shrink-0 text-xs font-semibold text-athletix-primary">
        {formatMinute(event.time)}
      </span>
      <span className="text-base">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-white">{event.player.name}</span>
        {event.assist.name && (
          <span className="text-xs text-athletix-text-muted"> · {event.assist.name}</span>
        )}
        <span className="ml-2 text-xs text-athletix-text-muted">{event.detail}</span>
      </div>
      <span className="hidden truncate text-xs text-athletix-text-muted sm:inline">
        {event.team.name}
      </span>
    </motion.div>
  );
}

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>("goals");

  const { data, loading } = useFetch(() => football.matchDetails(id), [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const match = data?.match;
  if (!match) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-athletix-text-muted">
        Match not found.
      </div>
    );
  }

  const stats = (data?.statistics as TeamStats[]) ?? [];
  const events = data?.events ?? [];
  const goals = events.filter(
    (e) =>
      e.type === "Goal" &&
      e.player.name?.trim() &&
      !e.detail?.toLowerCase().includes("missed") &&
      !e.detail?.toLowerCase().includes("cancelled")
  );
  const lineups = (data?.lineups as TeamLineup[]) ?? [];
  const scoreSummary = data?.scoreSummary ?? [];
  const detailMessage = data?.meta?.message;
  const score = displayScore(match.goals, scoreSummary, match.status.short);
  const live = isLive(match.status.short);
  const finished = isFinished(match.status.short);
  const homeStats = statsForTeam(stats, match.teams.home.name, 0);
  const awayStats = statsForTeam(stats, match.teams.away.name, 1);
  const statRows = buildStatRows(homeStats, awayStats);
  const showFifaRank = isInternationalMatch(match.league.id, match.league.name);
  const homeFifa = showFifaRank ? getFifaRank(match.teams.home.name) : null;
  const awayFifa = showFifaRank ? getFifaRank(match.teams.away.name) : null;

  const { home: homeLineup, away: awayLineup } = resolveMatchLineups(
    lineups,
    match.teams.home,
    match.teams.away
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "goals", label: "Goalscorers", count: goals.length },
    { id: "timeline", label: "Timeline", count: events.length },
    { id: "stats", label: "Stats" },
    { id: "lineups", label: "Lineups" },
  ];

  return (
    <div className={`mx-auto ${tab === "lineups" && homeLineup && awayLineup ? "max-w-2xl" : "max-w-3xl"}`}>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm text-athletix-text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Scoreboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="mb-5 flex items-center justify-center gap-2">
            <TeamLogo src={match.league.logo} alt={match.league.name} size={18} />
            <span className="text-xs text-athletix-text-muted">
              {match.league.name} · {match.league.round}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/team/${match.teams.home.id}`)}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <TeamLogo src={match.teams.home.logo} alt={match.teams.home.name} size={56} />
              <span className="text-center text-sm font-semibold text-white">
                {match.teams.home.name}
              </span>
              {homeFifa !== null && (
                <span className="text-[10px] font-medium text-athletix-text-muted">
                  FIFA #{homeFifa}
                </span>
              )}
            </button>
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
                {score.home} : {score.away}
              </div>
              {score.pens && (
                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-athletix-text-muted">
                  Pens {score.pens.home ?? 0} - {score.pens.away ?? 0}
                </span>
              )}
              {live ? (
                <LiveBadge elapsed={match.status.elapsed} />
              ) : (
                <span className="text-xs text-athletix-text-muted">
                  {finished ? "Full time" : formatMatchDate(match.date)} ·{" "}
                  {!finished && formatKickoff(match.date)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/team/${match.teams.away.id}`)}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <TeamLogo src={match.teams.away.logo} alt={match.teams.away.name} size={56} />
              <span className="text-center text-sm font-semibold text-white">
                {match.teams.away.name}
              </span>
              {awayFifa !== null && (
                <span className="text-[10px] font-medium text-athletix-text-muted">
                  FIFA #{awayFifa}
                </span>
              )}
            </button>
          </div>

          <ScoreSummaryRow rows={scoreSummary} />

          {match.venue.name && (
            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-athletix-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {match.venue.name}
              {match.venue.city ? `, ${match.venue.city}` : ""}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-athletix-primary/20 text-athletix-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
                : "bg-white/[0.03] text-athletix-text-muted hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* Goalscorers */}
      {tab === "goals" &&
        (goals.length > 0 ? (
          <div className="auth-glass-card space-y-2 rounded-2xl p-4">
            {goals.map((goal, i) => (
              <GoalRow key={`${goal.time.elapsed}-${goal.player.name}-${i}`} event={goal} index={i} />
            ))}
          </div>
        ) : (
          <div className="auth-glass-card space-y-4 rounded-2xl p-5">
            {scoreSummary.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-athletix-text-muted">
                  Score breakdown
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {scoreSummary.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <span className="text-sm text-athletix-text-muted">{row.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {row.home ?? 0} - {row.away ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-center text-sm text-athletix-text-muted">
              {detailMessage ??
                (finished
                  ? "Individual goal scorers and times are not available for this match from the data provider."
                  : "Goalscorers will appear here once goals are scored.")}
            </p>
          </div>
        ))}

      {/* Timeline */}
      {tab === "timeline" &&
        (events.length > 0 ? (
          <div className="auth-glass-card space-y-3 rounded-2xl p-5">
            {events.map((e, i) => (
              <EventRow key={`${e.type}-${e.time.elapsed}-${i}`} event={e} index={i} />
            ))}
          </div>
        ) : (
          <Empty message={detailMessage ?? "No match events yet."} />
        ))}

      {/* Stats */}
      {tab === "stats" &&
        (statRows.length > 0 ? (
          <div className="auth-glass-card divide-y divide-white/[0.04] rounded-2xl px-5 py-2">
            {statRows.map((row) => (
              <StatBar
                key={row.type}
                label={row.label}
                home={statValue(homeStats, row.type)}
                away={statValue(awayStats, row.type)}
                percent={row.percent}
              />
            ))}
          </div>
        ) : (
          <Empty
            message={
              detailMessage ??
              (finished
                ? "Match statistics are not available for this fixture on the current data plan."
                : "Statistics will appear once the match begins.")
            }
          />
        ))}

      {/* Lineups */}
      {tab === "lineups" &&
        (homeLineup && awayLineup ? (
          <MatchPitchLineup home={homeLineup} away={awayLineup} events={events} />
        ) : lineups.length > 0 ? (
          <MatchLineupList lineups={lineups} events={events} />
        ) : (
          <Empty
            message={
              detailMessage ??
              (finished
                ? "Lineups are not available for this fixture on the current data plan."
                : "Lineups will be announced before kickoff.")
            }
          />
        ))}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-12 text-center text-sm text-athletix-text-muted">
      {message}
    </div>
  );
}
