"use client";

import { Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/dashboard/ui/PlayerAvatar";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { playerRoute } from "@/lib/football";

export interface PlayerOfTheMatchDisplay {
  player: { id: number | string; name: string; photo: string };
  team: { id: number | string; name: string; logo: string };
  rating?: number | null;
  goals?: number | null;
  assists?: number | null;
  statLabel?: string;
  statValue?: string;
  provisional?: boolean;
}

interface PlayerOfTheMatchCardProps {
  potm: PlayerOfTheMatchDisplay;
  sport?: "football" | "cricket";
}

function footballSubtitle(potm: PlayerOfTheMatchDisplay): string {
  const parts: string[] = [];
  if (potm.rating) parts.push(`Rating ${potm.rating.toFixed(1)}`);
  if (potm.goals) parts.push(`${potm.goals} goal${potm.goals === 1 ? "" : "s"}`);
  if (potm.assists) parts.push(`${potm.assists} assist${potm.assists === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function PlayerOfTheMatchCard({ potm, sport = "football" }: PlayerOfTheMatchCardProps) {
  const router = useRouter();
  const subtitle =
    sport === "cricket"
      ? [potm.statLabel, potm.statValue].filter(Boolean).join(" · ")
      : footballSubtitle(potm);

  const canNavigate = sport === "football" && Number(potm.player.id) > 0;

  return (
    <div className="auth-glass-card relative overflow-hidden rounded-2xl border border-amber-400/20 p-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(251,191,36,0.12) 0%, transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25">
          <Award className="h-5 w-5" />
        </div>

        <button
          type="button"
          disabled={!canNavigate}
          onClick={() => {
            if (!canNavigate) return;
            router.push(playerRoute(Number(potm.player.id), potm.player.name));
          }}
          className={`flex min-w-0 flex-1 items-center gap-3 text-left ${
            canNavigate ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <PlayerAvatar src={potm.player.photo} name={potm.player.name} size={52} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/80">
              Player of the Match
              {potm.provisional ? " · Leading" : ""}
            </p>
            <p className="truncate text-base font-bold text-white">{potm.player.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {potm.team.logo ? (
                <TeamLogo src={potm.team.logo} alt={potm.team.name} size={14} />
              ) : null}
              <span className="truncate text-xs text-athletix-text-muted">
                {potm.team.name}
                {subtitle ? ` · ${subtitle}` : ""}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
