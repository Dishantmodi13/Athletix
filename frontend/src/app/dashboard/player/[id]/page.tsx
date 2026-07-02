"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { useFetch } from "@/hooks/useFetch";
import { football } from "@/lib/football";

interface PlayerData {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    height: string | null;
    weight: string | null;
    photo: string;
    birth: { date: string | null };
  };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    league: { name: string; season: number };
    games: { appearences: number | null; position: string | null };
    goals: { total: number | null; assists: number | null };
    cards: { yellow: number | null; red: number | null };
  }>;
}

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
  const router = useRouter();
  const id = Number(params.id);

  const { data, loading } = useFetch(() => football.player(id), [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const player = data as PlayerData | undefined;
  if (!player?.player) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-athletix-text-muted">
        Player not found.
      </div>
    );
  }

  const stat = player.statistics?.[0];
  const totalGoals = player.statistics?.reduce((sum, s) => sum + (s.goals.total ?? 0), 0) ?? 0;
  const totalAssists = player.statistics?.reduce((sum, s) => sum + (s.goals.assists ?? 0), 0) ?? 0;
  const totalApps = player.statistics?.reduce((sum, s) => sum + (s.games.appearences ?? 0), 0) ?? 0;
  const totalCards = player.statistics?.reduce(
    (sum, s) => sum + (s.cards.yellow ?? 0) + (s.cards.red ?? 0),
    0
  ) ?? 0;

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
          <TeamLogo src={player.player.photo} alt={player.player.name} size={88} className="rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {player.player.name}
            </h1>
            <p className="mt-1 text-sm text-athletix-text-muted">{player.player.nationality}</p>
            {stat?.team && (
              <div className="mt-2 flex items-center gap-2">
                <TeamLogo src={stat.team.logo} alt={stat.team.name} size={20} />
                <span className="text-xs text-athletix-text-secondary">{stat.team.name}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Goals" value={totalGoals} />
        <StatTile label="Assists" value={totalAssists} />
        <StatTile label="Appearances" value={totalApps} />
        <StatTile label="Cards" value={totalCards} />
      </div>

      <div className="auth-glass-card rounded-2xl px-5 py-2">
        <InfoRow label="Age" value={String(player.player.age ?? "—")} />
        <InfoRow label="Nationality" value={player.player.nationality ?? "—"} />
        <InfoRow label="Height" value={player.player.height ?? "—"} />
        <InfoRow label="Weight" value={player.player.weight ?? "—"} />
        <InfoRow label="Position" value={stat?.games.position ?? "—"} />
        <InfoRow label="Club" value={stat?.team.name ?? "—"} />
      </div>
    </div>
  );
}
