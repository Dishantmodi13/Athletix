"use client";

import { HeartOff } from "lucide-react";
import Link from "next/link";
import { useFollowedTeams } from "@/hooks/useFollowedTeams";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { teamRoute } from "@/lib/football";

export function FollowedTeamsSection() {
  const { teams, unfollowTeam } = useFollowedTeams();

  if (teams.length === 0) {
    return (
      <div className="auth-glass-card rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white">Following</h2>
        <p className="mt-2 text-sm text-athletix-text-muted">
          Teams you follow will appear here. Open any team page and tap Follow to add them.
        </p>
      </div>
    );
  }

  return (
    <div className="auth-glass-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Following</h2>
          <p className="mt-1 text-xs text-athletix-text-muted">
            {teams.length} team{teams.length === 1 ? "" : "s"} · shown first on your home feed
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
          >
            <Link
              href={teamRoute(team.id, team.name)}
              className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
            >
              <TeamLogo src={team.logo ?? ""} alt={team.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{team.name}</p>
                <p className="text-[11px] text-athletix-text-muted">View team profile</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void unfollowTeam(team.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-athletix-text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <HeartOff className="h-3.5 w-3.5" />
              Unfollow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
