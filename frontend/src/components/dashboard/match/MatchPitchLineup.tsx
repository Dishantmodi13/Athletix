"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/dashboard/ui/PlayerAvatar";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import type { MatchEvent } from "@/lib/football";
import { playerRoute } from "@/lib/football";

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

interface SubstitutionInfo {
  kind: "in" | "out";
  minute: number;
  otherPlayer?: string | null;
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

function namesMatch(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z]/g, "");
  return na.includes(nb) || nb.includes(na);
}

function playerMatches(
  playerId: number,
  playerName: string,
  eventName: string,
  eventId?: number
): boolean {
  if (eventId && playerId > 0 && eventId === playerId) return true;
  return (
    eventName.toLowerCase() === playerName.toLowerCase() ||
    namesMatch(eventName, playerName)
  );
}

/** player = subbed off, assist = subbed on (API-Football convention). */
export function getSubstitutionInfo(
  playerId: number,
  playerName: string,
  teamId: number,
  events: MatchEvent[],
  teamName?: string
): SubstitutionInfo | null {
  for (const event of events) {
    if (event.type !== "subst") continue;
    const sameTeam =
      event.team.id === teamId ||
      (teamName ? namesMatch(event.team.name, teamName) : false);
    if (!sameTeam) continue;

    if (event.assist?.name && playerMatches(playerId, playerName, event.assist.name)) {
      return {
        kind: "in",
        minute: event.time.elapsed,
        otherPlayer: event.player.name,
      };
    }

    if (playerMatches(playerId, playerName, event.player.name, event.player.id)) {
      return {
        kind: "out",
        minute: event.time.elapsed,
        otherPlayer: event.assist?.name,
      };
    }
  }

  return null;
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
      const x = 14 + ((entry.grid.col - 0.5) / maxCol) * 70;
      const rowProgress = (row - 1) / Math.max(maxRow - 1, 1);
      // Push away team up and home team down to open space in the middle
      const y =
        side === "home"
          ? 90 - rowProgress * 34
          : 10 + rowProgress * 34;
      positions.set(entry.player.id, { x, y });
    });
  }

  return positions;
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
  events: MatchEvent[],
  teamName?: string
) {
  const lower = playerName.toLowerCase();
  return events.filter((e) => {
    if (e.type === "subst") return false;
    const sameTeam =
      e.team.id === teamId ||
      (teamName ? namesMatch(e.team.name, teamName) : false);
    if (!sameTeam) return false;
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

function SubstitutionBadge({ info }: { info: SubstitutionInfo }) {
  const Icon = info.kind === "in" ? ArrowUp : ArrowDown;
  const color = info.kind === "in" ? "text-emerald-400" : "text-rose-400";

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${color}`}
      title={
        info.otherPlayer
          ? info.kind === "in"
            ? `Replaced ${info.otherPlayer}`
            : `Replaced by ${info.otherPlayer}`
          : undefined
      }
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {info.minute}&apos;
    </span>
  );
}

function PitchPlayer({
  player,
  x,
  y,
  teamId,
  teamName,
  events,
  onClick,
}: {
  player: LineupPlayer;
  x: number;
  y: number;
  teamId: number;
  teamName: string;
  events: MatchEvent[];
  onClick: () => void;
}) {
  const matchEvents = playerEvents(player.id, player.name, teamId, events, teamName);
  const cards = matchEvents.filter((e) => e.type === "Card");
  const substitution = getSubstitutionInfo(
    player.id,
    player.name,
    teamId,
    events,
    teamName
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute z-10 flex w-[52px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition-transform hover:scale-105"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <PlayerAvatar src={player.photo} name={player.name} size={36} />
        {cards.some((c) => c.detail.includes("Red")) && (
          <span className="absolute -left-1 -top-1 h-3 w-2.5 rounded-sm bg-red-500" />
        )}
        {cards.some((c) => !c.detail.includes("Red")) && (
          <span className="absolute -left-1 -top-1 h-3 w-2.5 rounded-sm bg-yellow-400" />
        )}
        {substitution?.kind === "out" && (
          <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded bg-black/80 px-0.5 text-[8px] font-semibold text-rose-400">
            <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
            {substitution.minute}&apos;
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
  onPlayerClick: (id: number, name: string) => void;
}) {
  if (lineup.substitutes.length === 0) return null;

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-athletix-text-muted">
        Substitutes
      </p>
      <div className="space-y-1.5">
        {lineup.substitutes.map(({ player }) => {
          const substitution = getSubstitutionInfo(
            player.id,
            player.name,
            lineup.team.id,
            events,
            lineup.team.name
          );
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onPlayerClick(player.id, player.name)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
            >
              <PlayerAvatar src={player.photo} name={player.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-white">
                  {player.number} {player.name}
                </p>
                <p className="text-[9px] text-athletix-text-muted">{player.pos}</p>
              </div>
              {substitution?.kind === "in" ? <SubstitutionBadge info={substitution} /> : null}
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

  const goPlayer = (id: number, name: string) => {
    if (id > 0) router.push(playerRoute(id, name));
  };

  return (
    <div className="auth-glass-card overflow-hidden rounded-2xl">
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

      <div className="relative mx-auto aspect-[3/4] w-full max-w-lg bg-[#1a3d2e]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 133" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="129" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <line x1="2" y1="66.5" x2="98" y2="66.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <circle cx="50" cy="66.5" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
          <rect x="22" y="2" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          <rect x="22" y="113" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          <rect x="34" y="2" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          <rect x="34" y="125" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        </svg>

        {away.startXI.map(({ player }) => {
          const pos = awayPositions.get(player.id);
          if (!pos) return null;
          return (
            <PitchPlayer
              key={`away-${player.id}`}
              player={player}
              x={pos.x}
              y={pos.y}
              teamId={away.team.id}
              teamName={away.team.name}
              events={events}
              onClick={() => goPlayer(player.id, player.name)}
            />
          );
        })}

        {home.startXI.map(({ player }) => {
          const pos = homePositions.get(player.id);
          if (!pos) return null;
          return (
            <PitchPlayer
              key={`home-${player.id}`}
              player={player}
              x={pos.x}
              y={pos.y}
              teamId={home.team.id}
              teamName={home.team.name}
              events={events}
              onClick={() => goPlayer(player.id, player.name)}
            />
          );
        })}
      </div>

      <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-2">
        <SubstitutesColumn lineup={home} events={events} onPlayerClick={goPlayer} />
        <SubstitutesColumn lineup={away} events={events} onPlayerClick={goPlayer} />
      </div>
    </div>
  );
}
