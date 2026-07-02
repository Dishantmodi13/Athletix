"use client";

import { Search as SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { football } from "@/lib/football";

interface TeamResult {
  team: { id: number; name: string; logo: string; country?: string };
}
interface PlayerResult {
  player: { id: number; name: string; photo?: string; nationality?: string };
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";

  const [query, setQuery] = useState(initial);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setTeams([]);
      setPlayers([]);
      return;
    }

    const handle = setTimeout(() => {
      setLoading(true);
      football
        .search(query.trim())
        .then((res) => {
          setTeams((res.teams as TeamResult[]) ?? []);
          setPlayers((res.players as PlayerResult[]) ?? []);
        })
        .catch(() => {
          setTeams([]);
          setPlayers([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-white">Search</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-athletix-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams or players..."
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 pl-12 pr-4 text-base text-white outline-none transition-colors placeholder:text-athletix-text-muted focus:border-athletix-primary/40"
        />
      </div>

      {query.trim().length < 3 && (
        <p className="text-center text-sm text-athletix-text-muted">
          Type at least 3 characters to search.
        </p>
      )}

      {loading && (
        <p className="text-center text-sm text-athletix-text-muted">Searching...</p>
      )}

      {teams.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
            Teams
          </h2>
          <div className="auth-glass-card divide-y divide-white/[0.04] overflow-hidden rounded-2xl">
            {teams.slice(0, 10).map((t) => (
              <button
                key={t.team.id}
                type="button"
                onClick={() => router.push(`/dashboard/team/${t.team.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <TeamLogo src={t.team.logo} alt={t.team.name} size={32} />
                <span className="text-sm font-medium text-white">{t.team.name}</span>
                {t.team.country && (
                  <span className="ml-auto text-xs text-athletix-text-muted">{t.team.country}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {players.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
            Players
          </h2>
          <div className="auth-glass-card divide-y divide-white/[0.04] overflow-hidden rounded-2xl">
            {players.slice(0, 10).map((p) => (
              <button
                key={p.player.id}
                type="button"
                onClick={() => router.push(`/dashboard/player/${p.player.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <TeamLogo
                  src={p.player.photo ?? ""}
                  alt={p.player.name}
                  size={32}
                  className="rounded-full"
                />
                <span className="text-sm font-medium text-white">{p.player.name}</span>
                {p.player.nationality && (
                  <span className="ml-auto text-xs text-athletix-text-muted">
                    {p.player.nationality}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
