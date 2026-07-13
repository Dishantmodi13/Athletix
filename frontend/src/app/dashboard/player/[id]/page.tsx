"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { useFetch } from "@/hooks/useFetch";
import { football, type PlayerDetails } from "@/lib/football";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="auth-glass-card rounded-2xl px-4 py-5 text-center">
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-athletix-text-muted">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-2.5 text-sm last:border-0">
      <span className="text-athletix-text-muted">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const name = searchParams.get("name") ?? undefined;

  const { data, loading } = useFetch(() => football.player(id, name), [id, name]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const player = data as PlayerDetails | undefined;
  if (!player?.player) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-athletix-text-muted">
        Player not found.
      </div>
    );
  }

  const tournamentStats = player.statistics.filter(
    (s) => s.league.name && s.league.name !== "Club"
  );
  const totalGoals = tournamentStats.reduce((sum, s) => sum + (s.goals.total ?? 0), 0);
  const totalAssists = tournamentStats.reduce((sum, s) => sum + (s.goals.assists ?? 0), 0);
  const totalApps = tournamentStats.reduce((sum, s) => sum + (s.games.appearences ?? 0), 0);
  const totalCards = tournamentStats.reduce(
    (sum, s) => sum + (s.cards.yellow ?? 0) + (s.cards.red ?? 0),
    0
  );
  const hasSeasonStats = tournamentStats.some(
    (s) =>
      (s.goals.total ?? 0) > 0 ||
      (s.goals.assists ?? 0) > 0 ||
      (s.games.appearences ?? 0) > 0
  );
  const clubName = player.club?.name;
  const clubLogo = player.club?.logo;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm text-athletix-text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.18) 0%, transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-5">
          <TeamLogo
            src={player.player.photo}
            alt={player.player.name}
            size={88}
            className="rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {player.player.name}
            </h1>
            <p className="mt-1 text-sm text-athletix-text-muted">{player.player.nationality}</p>
            {clubName && (
              <div className="mt-2 flex items-center gap-2">
                {clubLogo ? <TeamLogo src={clubLogo} alt={clubName} size={20} /> : null}
                <span className="text-xs text-athletix-text-secondary">{clubName}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {hasSeasonStats ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Goals" value={totalGoals} />
            <StatTile label="Assists" value={totalAssists} />
            <StatTile label="Appearances" value={totalApps} />
            <StatTile label="Cards" value={totalCards} />
          </div>
          <div className="auth-glass-card mb-8 divide-y divide-white/[0.04] rounded-2xl px-5 py-2">
            {tournamentStats.map((row) => (
              <div key={`${row.league.name}-${row.league.season}`} className="py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {row.team.logo ? (
                      <TeamLogo src={row.team.logo} alt={row.team.name} size={18} />
                    ) : null}
                    <span className="text-sm font-medium text-white">
                      {row.league.name}
                      {row.league.season ? ` ${row.league.season}` : ""}
                    </span>
                  </div>
                  <span className="text-xs text-athletix-text-muted">{row.team.name}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-athletix-text-secondary">
                  <span>{row.games.appearences ?? 0} apps</span>
                  <span>{row.goals.total ?? 0} goals</span>
                  <span>{row.goals.assists ?? 0} assists</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mb-6 text-center text-xs text-athletix-text-muted">
          Tournament statistics are not available for this player yet.
        </p>
      )}

      <div className="auth-glass-card rounded-2xl px-5 py-2">
        <InfoRow label="Age" value={player.player.age != null ? String(player.player.age) : "—"} />
        <InfoRow label="Nationality" value={player.player.nationality || "—"} />
        <InfoRow label="Height" value={player.player.height ?? "—"} />
        <InfoRow label="Weight" value={player.player.weight ?? "—"} />
        <InfoRow
          label="Position"
          value={player.player.position ?? tournamentStats[0]?.games.position ?? "—"}
        />
        <InfoRow label="Club" value={clubName ?? "—"} />
        {player.player.birth.date && (
          <InfoRow label="Born" value={player.player.birth.date} />
        )}
      </div>
    </div>
  );
}
