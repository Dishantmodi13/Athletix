"use client";

import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/dashboard/ui/PlayerAvatar";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import type { TeamLineup } from "./MatchPitchLineup";

export function MatchLineupList({ lineups }: { lineups: TeamLineup[] }) {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lineups.map((lineup) => (
        <div key={lineup.team.id} className="auth-glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <TeamLogo src={lineup.team.logo} alt={lineup.team.name} size={28} />
            <div>
              <p className="text-sm font-semibold text-white">{lineup.team.name}</p>
              <p className="text-xs text-athletix-text-muted">{lineup.formation}</p>
            </div>
          </div>
          <div className="space-y-2">
            {lineup.startXI.map((p) => (
              <button
                key={p.player.id}
                type="button"
                onClick={() => p.player.id > 0 && router.push(`/dashboard/player/${p.player.id}`)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="w-6 text-center text-xs font-semibold text-athletix-text-muted">
                  {p.player.number}
                </span>
                <PlayerAvatar src={p.player.photo} name={p.player.name} size={32} />
                <span className="flex-1 text-sm text-white">{p.player.name}</span>
                <span className="text-xs text-athletix-text-muted">{p.player.pos}</span>
              </button>
            ))}
          </div>
          {lineup.substitutes.length > 0 && (
            <div className="mt-4 border-t border-white/[0.06] pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-athletix-text-muted">
                Substitutes
              </p>
              <div className="space-y-1.5">
                {lineup.substitutes.map(({ player }) => (
                  <div key={player.id} className="flex items-center gap-2 text-xs text-athletix-text-muted">
                    <PlayerAvatar src={player.photo} name={player.name} size={24} />
                    <span>
                      {player.number} {player.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lineup.coach?.name && (
            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-athletix-text-muted">
              <User className="h-3.5 w-3.5" /> {lineup.coach.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
