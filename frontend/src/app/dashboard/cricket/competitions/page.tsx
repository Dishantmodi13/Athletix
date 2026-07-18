"use client";

import { Globe, Trophy } from "lucide-react";
import { CricketMatchCard } from "@/components/cricket/CricketMatchCard";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { SkeletonCard } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { cricket, type CricketCompetition } from "@/lib/cricket";

const ACCENTS: Record<string, string> = {
  "Indian Premier League": "from-orange-500/20 to-blue-500/10 text-orange-300",
  "Big Bash League": "from-emerald-500/20 to-cyan-500/10 text-emerald-300",
  "ICC Cricket World Cup": "from-sky-500/20 to-indigo-500/10 text-sky-300",
  "ICC Men's T20 World Cup": "from-violet-500/20 to-fuchsia-500/10 text-violet-300",
  "ICC Champions Trophy": "from-amber-500/20 to-yellow-500/10 text-amber-300",
  "ICC World Test Championship": "from-rose-500/20 to-red-500/10 text-rose-300",
};

function CompetitionCard({ competition }: { competition: CricketCompetition }) {
  const accent = ACCENTS[competition.name] ?? "from-blue-500/20 to-cyan-500/10 text-blue-300";
  const hasMatches = competition.matches.length > 0;

  return (
    <div className="auth-glass-card overflow-hidden rounded-2xl">
      <div className={`bg-gradient-to-br ${accent} px-5 py-4`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">{competition.name}</p>
            <p className="mt-0.5 text-xs text-white/70">{competition.description}</p>
          </div>
          <Trophy className="h-6 w-6 shrink-0 opacity-80" />
        </div>
      </div>

      <div className="px-5 py-4">
        {hasMatches ? (
          <div className="grid gap-3">
            {competition.matches.slice(0, 3).map((m, i) => (
              <CricketMatchCard key={`${m.leagueId}-${m.id}`} match={m} index={i} />
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-athletix-text-muted">
            Off-season — no matches scheduled right now.
          </p>
        )}
      </div>
    </div>
  );
}

export default function CricketCompetitionsPage() {
  const competitions = useFetch(() => cricket.competitions(), []);

  const icc = competitions.data?.featured.filter((c) => c.category === "icc") ?? [];
  const leagues = competitions.data?.featured.filter((c) => c.category === "league") ?? [];
  const active = competitions.data?.active ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <SectionHeader title="Cricket Competitions" icon={<Trophy className="h-5 w-5" />} />

      {competitions.loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : competitions.error ? (
        <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
          Could not load competitions. Please try again shortly.
        </div>
      ) : (
        <>
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-athletix-text-muted">
              Franchise Leagues
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {leagues.map((c) => (
                <CompetitionCard key={c.name} competition={c} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-athletix-text-muted">
              ICC Tournaments
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {icc.map((c) => (
                <CompetitionCard key={c.name} competition={c} />
              ))}
            </div>
          </section>

          {active.length > 0 && (
            <section>
              <SectionHeader title="Active Series" icon={<Globe className="h-5 w-5" />} />
              <div className="space-y-8">
                {active.map((series) => (
                  <div key={`${series.leagueId}-${series.name}`}>
                    <h3 className="mb-3 text-sm font-semibold text-athletix-text-secondary">
                      {series.name}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {series.matches.map((m, i) => (
                        <CricketMatchCard key={`${m.leagueId}-${m.id}`} match={m} index={i} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
