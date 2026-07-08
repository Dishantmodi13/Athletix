"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import {
  isFinished,
  isLive,
  type BracketMatch,
  type BracketTeam,
  type KnockoutBracket,
} from "@/lib/football";
import { formatKickoff, formatShortDate } from "@/lib/format";
import { TeamLogo } from "./ui/TeamLogo";

const CARD_W = 142;
const CARD_H = 78;
const UNIT = 100;
const LEAVES = 8;
const TREE_H = UNIT * LEAVES;
const GAP = 36;
const COL_STEP = CARD_W + GAP;
const HEADER_H = 26;

interface KnockoutBracketProps {
  bracket: KnockoutBracket;
}

function matchTop(depth: number, index: number): number {
  const slot = UNIT * 2 ** depth;
  return index * slot + (slot - CARD_H) / 2;
}

function matchCenterY(depth: number, index: number): number {
  return matchTop(depth, index) + CARD_H / 2;
}

function relativeDate(iso: string): string {
  const now = new Date();
  const kickoff = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDay = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate());
  const diff = Math.round((matchDay.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  try {
    return formatShortDate(iso);
  } catch {
    return "";
  }
}

function BracketTeamRow({ team }: { team: BracketTeam }) {
  const tbd = team.code === "TBD" || team.name === "TBD" || team.id === 0;

  return (
    <div className="flex items-center gap-1.5">
      {tbd ? (
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[8px] text-white/30">
          ?
        </div>
      ) : (
        <TeamLogo src={team.logo} alt={team.name} size={18} />
      )}
      <span
        className={`truncate text-[11px] font-bold tracking-wide ${
          team.winner ? "text-white" : tbd ? "text-white/30" : "text-white/70"
        }`}
      >
        {tbd ? "TBD" : team.code}
      </span>
    </div>
  );
}

function BracketMatchCard({
  match,
  badge,
  badgeClass,
}: {
  match: BracketMatch;
  badge?: string;
  badgeClass?: string;
}) {
  const finished = isFinished(match.status.short);
  const live = isLive(match.status.short);
  const hasScore = finished || live;

  return (
    <Link
      href={`/dashboard/match/${match.id}`}
      className="relative block h-full w-full overflow-hidden rounded-lg border border-white/[0.09] bg-[#1a1a1a] transition-colors hover:border-white/20 hover:bg-[#222]"
    >
      {badge && (
        <div className="absolute left-0 right-0 top-0 z-10 flex justify-center">
          <span
            className={`rounded-b px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
      )}

      <div className={`flex h-full flex-col justify-center px-2 ${badge ? "pt-3" : "pt-1"}`}>
        <div className="flex items-stretch gap-1">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <BracketTeamRow team={match.home} />
            <BracketTeamRow team={match.away} />
          </div>

          {hasScore && match.home.score !== null && match.away.score !== null && (
            <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
              <span
                className={`text-[11px] font-bold tabular-nums leading-none ${
                  match.home.winner ? "text-white" : "text-white/40"
                }`}
              >
                {match.home.score}
              </span>
              <span className="my-0.5 text-[9px] leading-none text-white/25">-</span>
              <span
                className={`text-[11px] font-bold tabular-nums leading-none ${
                  match.away.winner ? "text-white" : "text-white/40"
                }`}
              >
                {match.away.score}
              </span>
            </div>
          )}
        </div>

        <p className="mt-1 truncate text-center text-[9px] text-white/35">
          {live ? (
            <span className="text-red-400">
              Live{match.status.elapsed != null ? ` ${match.status.elapsed}'` : ""}
            </span>
          ) : finished ? (
            "FT"
          ) : (
            <>
              {relativeDate(match.date)}
              <span className="text-white/20"> · {formatKickoff(match.date)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

function BracketLines({
  rounds,
  side,
  colOffset,
}: {
  rounds: BracketMatch[][];
  side: "left" | "right";
  colOffset: number;
}) {
  const paths: string[] = [];

  for (let r = 1; r < rounds.length; r++) {
    const curr = rounds[r];
    if (curr.length === 0) continue;

    const parentCol = side === "left" ? r - 1 : 3 - (r - 1);
    const childCol = side === "left" ? r : 3 - r;

    const x1 =
      side === "left"
        ? colOffset + parentCol * COL_STEP + CARD_W
        : colOffset + parentCol * COL_STEP;
    const x2 =
      side === "left"
        ? colOffset + childCol * COL_STEP
        : colOffset + childCol * COL_STEP + CARD_W;
    const midX = (x1 + x2) / 2;

    for (let i = 0; i < curr.length; i++) {
      const cy = matchCenterY(r, i);
      const y1 = matchCenterY(r - 1, i * 2);
      const y2 = matchCenterY(r - 1, i * 2 + 1);

      if (side === "left") {
        paths.push(`M ${x1} ${y1} H ${midX} V ${cy} H ${x2}`);
        paths.push(`M ${x1} ${y2} H ${midX} V ${cy}`);
      } else {
        paths.push(`M ${x1} ${y1} H ${midX} V ${cy} H ${x2}`);
        paths.push(`M ${x1} ${y2} H ${midX} V ${cy}`);
      }
    }
  }

  const semiCol = side === "left" ? 3 : 0;
  const semiCenter = matchCenterY(3, 0);
  const semiEdge =
    side === "left"
      ? colOffset + semiCol * COL_STEP + CARD_W
      : colOffset + semiCol * COL_STEP;
  const centerEdge =
    side === "left" ? semiEdge + GAP / 2 : semiEdge - GAP / 2;

  paths.push(`M ${semiEdge} ${semiCenter} H ${centerEdge}`);

  return (
    <svg
      className="pointer-events-none absolute left-0 overflow-visible"
      style={{ top: HEADER_H, width: "100%", height: TREE_H }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      ))}
    </svg>
  );
}

const ROUND_LABELS = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals"];

function BracketSide({
  rounds,
  side,
  colOffset,
}: {
  rounds: BracketMatch[][];
  side: "left" | "right";
  colOffset: number;
}) {
  return (
    <div
      className="absolute"
      style={{ left: colOffset, top: HEADER_H, width: 4 * COL_STEP, height: TREE_H }}
    >
      {ROUND_LABELS.map((label, depth) => {
        const col = side === "left" ? depth : 3 - depth;
        return (
          <span
            key={`${side}-${label}`}
            className="absolute text-[9px] font-medium uppercase tracking-widest text-white/30"
            style={{
              left: col * COL_STEP,
              top: -HEADER_H,
              width: CARD_W,
              textAlign: side === "right" ? "right" : "left",
            }}
          >
            {label}
          </span>
        );
      })}

      {rounds.map((matches, depth) =>
        matches.map((match, index) => {
          const col = side === "left" ? depth : 3 - depth;
          return (
            <div
              key={match.id}
              className="absolute"
              style={{
                left: col * COL_STEP,
                top: matchTop(depth, index),
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <BracketMatchCard match={match} />
            </div>
          );
        })
      )}
    </div>
  );
}

function CenterBlock({
  bracket,
  left,
  width,
}: {
  bracket: KnockoutBracket;
  left: number;
  width: number;
}) {
  const finalTop = matchTop(3, 0);
  const bronzeTop = finalTop + CARD_H + 48;

  return (
    <div className="absolute" style={{ left, top: HEADER_H, width, height: TREE_H }}>
      <div
        className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{ top: 4, width: CARD_W }}
      >
        {bracket.champion ? (
          <>
            <TeamLogo src={bracket.champion.logo} alt={bracket.champion.name} size={40} />
            <span className="text-xs font-bold text-white">{bracket.champion.code}</span>
          </>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
            <Trophy className="h-5 w-5 text-white/25" />
          </div>
        )}
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-500/70">
          Champion
        </span>
      </div>

      {bracket.final && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: finalTop, width: CARD_W, height: CARD_H }}
        >
          <BracketMatchCard
            match={bracket.final}
            badge="Final"
            badgeClass="bg-amber-500/30 text-amber-200"
          />
        </div>
      )}

      {bracket.thirdPlace && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: bronzeTop, width: CARD_W, height: CARD_H }}
        >
          <BracketMatchCard
            match={bracket.thirdPlace}
            badge="Bronze-final"
            badgeClass="bg-sky-500/30 text-sky-200"
          />
        </div>
      )}
    </div>
  );
}

export function KnockoutBracketView({ bracket }: KnockoutBracketProps) {
  const hasKnockout = bracket.last32.left.length + bracket.last32.right.length > 0;

  if (!hasKnockout && !bracket.final) {
    return (
      <div className="auth-glass-card rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
        Knockout bracket will appear once the Round of 32 is confirmed.
      </div>
    );
  }

  const leftRounds = [
    bracket.last32.left,
    bracket.last16.left,
    bracket.quarterFinals.left,
    bracket.semiFinals.left,
  ];

  const rightRounds = [
    bracket.last32.right,
    bracket.last16.right,
    bracket.quarterFinals.right,
    bracket.semiFinals.right,
  ];

  const leftW = 4 * COL_STEP;
  const centerW = CARD_W + 40;
  const rightW = 4 * COL_STEP;
  const totalW = leftW + centerW + rightW;

  return (
    <div className="space-y-3">
      <p className="text-xs text-athletix-text-muted">
        Bracket syncs from live tournament data · refreshes every few minutes
      </p>

      <div className="knockout-bracket-shell rounded-2xl border border-white/[0.06] bg-[#080808] p-3 sm:p-4">
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
          <div
            className="relative mx-auto"
            style={{ width: totalW, height: TREE_H + HEADER_H + 12, minWidth: totalW }}
          >
            <BracketLines rounds={leftRounds} side="left" colOffset={0} />
            <BracketLines rounds={rightRounds} side="right" colOffset={leftW + centerW} />

            <BracketSide rounds={leftRounds} side="left" colOffset={0} />
            <CenterBlock bracket={bracket} left={leftW} width={centerW} />
            <BracketSide rounds={rightRounds} side="right" colOffset={leftW + centerW} />
          </div>
        </div>
      </div>
    </div>
  );
}
