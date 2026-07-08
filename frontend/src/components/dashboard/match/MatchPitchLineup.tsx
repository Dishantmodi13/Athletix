"use client";

import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/dashboard/ui/PlayerAvatar";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import type { MatchEvent } from "@/lib/football";

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string | null;
  photo: string;
}

export interface TeamLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  startXI: Array<{ player: LineupPlayer }>;
  substitutes: Array<{ player: LineupPlayer }>;
  coach: { id?: number; name: string; photo: string };
}

interface MatchPitchLineupProps {
  home: TeamLineup;
  away: TeamLineup;
  events?: MatchEvent[];
}

interface GridPos {
  row: number;
  col: number;
}

function parseGrid(grid: string | null): GridPos | null {
  if (!grid) return null;
  const [row, col] = grid.split(":").map(Number);
  if (!row || !col) return null;
  return { row, col };
}

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1]! : full;
}

function computePositions(
  players: LineupPlayer[],
  side: "home" | "away"
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const withGrid = players
    .map((p) => ({ player: p, grid: parseGrid(p.grid) }))
    .filter((entry): entry is { player: LineupPlayer; grid: GridPos } => entry.grid !== null);

  const byRow = new Map<number, Array<{ player: LineupPlayer; grid: GridPos }>>();
  for (const entry of withGrid) {
    const row = entry.grid.row;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push(entry);
  }

  const maxRow = Math.max(...withGrid.map((e) => e.grid.row), 1);

  for (const [row, rowPlayers] of byRow) {
    const maxCol = Math.max(...rowPlayers.map((e) => e.grid.col), 1);
    rowPlayers.sort((a, b) => a.grid.col - b.grid.col);

    rowPlayers.forEach((entry) => {
      const x = 12 + ((entry.grid.col - 0.5) / maxCol) * 76;
      const rowProgress = (row - 1) / Math.max(maxRow - 1, 1);
      const y =
        side === "home"
          ? 88 - rowProgress * 36
          : 12 + rowProgress * 36;
      positions.set(entry.player.id, { x, y });
    });
  }

  return positions;
}

function namesMatch(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z]/g, "");
  return na.includes(nb) || nb.includes(na);
}

export function resolveMatchLineups(
  lineups: TeamLineup[],
  home: { id: number; name: string },
  away: { id: number; name: string }
): { home?: TeamLineup; away?: TeamLineup } {
  if (lineups.length < 2) {
    return { home: lineups[0], away: lineups[1] };
  }

  const homeLineup =
    lineups.find((l) => l.team.id === home.id) ??
    lineups.find((l) => namesMatch(l.team.name, home.name));
  const awayLineup =
    lineups.find((l) => l.team.id === away.id) ??
    lineups.find((l) => namesMatch(l.team.name, away.name));

  if (homeLineup && awayLineup && homeLineup.team.id !== awayLineup.team.id) {
    return { home: homeLineup, away: awayLineup };
  }

  const remaining = lineups.filter((l) => l !== homeLineup);
  return {
    home: homeLineup ?? lineups[0],
    away: awayLineup ?? remaining[0] ?? lineups[1],
  };
}

function playerEvents(
  playerId: number,
  playerName: string,
  teamId: number,
  events: MatchEvent[]
) {
  const lower = playerName.toLowerCase();
  return events.filter((e) => {
    const playerMatch =
      e.player.id === playerId ||
      e.player.name.toLowerCase() === lower ||
      e.player.name.toLowerCase().includes(lower) ||
      lower.includes(e.player.name.toLowerCase());
    const assistMatch =
      e.assist?.name &&
      (e.assist.name.toLowerCase() === lower ||
        e.assist.name.toLowerCase().includes(lower));
    return playerMatch || Boolean(assistMatch);
  });
}

function PitchPlayer({
  player,
  x,
  y,
  events,
  onClick,
}: {
  player: LineupPlayer;
  x: number;
  y: number;
  events: MatchEvent[];
  onClick: () => void;
}) {
  const goals = events.filter((e) => e.type === "Goal");
  const cards = events.filter((e) => e.type === "Card");
  const sub = events.find((e) => e.type === "subst");

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute z-10 flex w-[52px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition-transform hover:scale-105"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <PlayerAvatar src={player.photo} name={player.name} size={36} />
        {goals.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px]">
            ⚽
          </span>
        )}
        {cards.some((c) => c.detail.includes("Red")) && (
          <span className="absolute -left-1 -top-1 h-3 w-2.5 rounded-sm bg-red-500" />
        )}
        {cards.some((c) => !c.detail.includes("Red")) && (
          <span className="absolute -left-1 -top-1 h-3 w-2.5 rounded-sm bg-yellow-400" />
        )}
        {sub && (
          <span className="absolute -bottom-1 -right-1 rounded bg-black/80 px-0.5 text-[8px] text-green-400">
            {sub.time.elapsed}&apos;
          </span>
        )}
      </div>
      <span className="max-w-[56px] truncate text-center text-[9px] font-semibold leading-tight text-white">
        {player.number} {lastName(player.name)}
      </span>
    </button>
  );
}

function SubstitutesColumn({
  lineup,
  events,
  onPlayerClick,
}: {
  lineup: TeamLineup;
  events: MatchEvent[];
  onPlayerClick: (id: number) => void;
}) {
  if (lineup.substitutes.length === 0) return null;

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-athletix-text-muted">
        Substitutes
      </p>
      <div className="space-y-1.5">
        {lineup.substitutes.map(({ player }) => {
          const ev = playerEvents(player.id, player.name, lineup.team.id, events);
          const subIn = ev.find((e) => e.type === "subst");
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onPlayerClick(player.id)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
            >
              <PlayerAvatar src={player.photo} name={player.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-white">
                  {player.number} {player.name}
                </p>
                <p className="text-[9px] text-athletix-text-muted">{player.pos}</p>
              </div>
              {subIn && (
                <span className="shrink-0 text-[9px] text-green-400">{subIn.time.elapsed}&apos;</span>
              )}
            </button>
          );
        })}
      </div>
      {lineup.coach.name && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
          <PlayerAvatar src={lineup.coach.photo} name={lineup.coach.name} size={24} />
          <div>
            <p className="text-[9px] text-athletix-text-muted">Coach</p>
            <p className="text-[11px] font-medium text-white">{lineup.coach.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MatchPitchLineup({ home, away, events = [] }: MatchPitchLineupProps) {
  const router = useRouter();
  const homePositions = computePositions(
    home.startXI.map((r) => r.player),
    "home"
  );
  const awayPositions = computePositions(
    away.startXI.map((r) => r.player),
    "away"
  );

  const goPlayer = (id: number) => {
    if (id > 0) router.push(`/dashboard/player/${id}`);
  };

  return (
    <div className="auth-glass-card overflow-hidden rounded-2xl">
      {/* Formation header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <TeamLogo src={home.team.logo} alt={home.team.name} size={20} />
          <span className="text-xs font-semibold text-white">{home.team.name}</span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-athletix-text-muted">
            {home.formation}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-athletix-text-muted">
            {away.formation}
          </span>
          <span className="text-xs font-semibold text-white">{away.team.name}</span>
          <TeamLogo src={away.team.logo} alt={away.team.name} size={20} />
        </div>
      </div>

      {/* Pitch */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-lg bg-[#1a3d2e]">
        {/* Pitch markings */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 133" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="129" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <line x1="2" y1="66.5" x2="98" y2="66.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <circle cx="50" cy="66.5" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
          <rect x="22" y="2" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          <rect x="22" y="113" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          <rect x="34" y="2" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          <rect x="34" y="125" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        </svg>

        {/* Away players (top) */}
        {away.startXI.map(({ player }) => {
          const pos = awayPositions.get(player.id);
          if (!pos) return null;
          const ev = playerEvents(player.id, player.name, away.team.id, events);
          return (
            <PitchPlayer
              key={`away-${player.id}`}
              player={player}
              x={pos.x}
              y={pos.y}
              events={ev}
              onClick={() => goPlayer(player.id)}
            />
          );
        })}

        {/* Home players (bottom) */}
        {home.startXI.map(({ player }) => {
          const pos = homePositions.get(player.id);
          if (!pos) return null;
          const ev = playerEvents(player.id, player.name, home.team.id, events);
          return (
            <PitchPlayer
              key={`home-${player.id}`}
              player={player}
              x={pos.x}
              y={pos.y}
              events={ev}
              onClick={() => goPlayer(player.id)}
            />
          );
        })}
      </div>

      {/* Substitutes */}
      <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-2">
        <SubstitutesColumn lineup={home} events={events} onPlayerClick={goPlayer} />
        <SubstitutesColumn lineup={away} events={events} onPlayerClick={goPlayer} />
      </div>
    </div>
  );
}
