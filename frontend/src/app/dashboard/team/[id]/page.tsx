"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FavoriteButton } from "@/components/dashboard/FavoriteButton";
import { MatchCard } from "@/components/dashboard/MatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { useFetch } from "@/hooks/useFetch";
import { football } from "@/lib/football";

interface TeamInfo {
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
    founded: number;
  };
  venue: { name: string | null; city: string | null; capacity: number | null };
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data, loading } = useFetch(() => football.team(id), [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const info = data?.team as TeamInfo | undefined;
  const fixtures = data?.fixtures ?? [];

  if (!info?.team) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center text-sm text-athletix-text-muted">
        Team not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm text-athletix-text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Banner */}
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
          <TeamLogo src={info.team.logo} alt={info.team.name} size={80} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {info.team.name}
            </h1>
            <p className="mt-1 text-sm text-athletix-text-muted">
              {info.team.country}
              {info.team.founded ? ` · Founded ${info.team.founded}` : ""}
            </p>
            {info.venue?.name && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-athletix-text-muted">
                <MapPin className="h-3.5 w-3.5" />
                {info.venue.name}
                {info.venue.capacity ? ` · ${info.venue.capacity.toLocaleString()} seats` : ""}
              </p>
            )}
            <div className="mt-4">
              <FavoriteButton
                favorite={{
                  type: "team",
                  id: info.team.id,
                  name: info.team.name,
                  logo: info.team.logo,
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <SectionHeader title="Recent & Upcoming" />
      {fixtures.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fixtures.map((m, i) => (
            <MatchCard key={m.id} match={m} index={i} />
          ))}
        </div>
      ) : (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-12 text-center text-sm text-athletix-text-muted">
          No recent fixtures available.
        </div>
      )}
    </div>
  );
}
