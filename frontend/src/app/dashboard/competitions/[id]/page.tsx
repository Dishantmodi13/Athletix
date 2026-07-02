"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { KnockoutBracketView } from "@/components/dashboard/KnockoutBracket";
import { MatchCard } from "@/components/dashboard/MatchCard";
import { StandingsGroups } from "@/components/dashboard/StandingsGroups";
import { TopScorersList } from "@/components/dashboard/TopScorersList";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { FIFA_WORLD_CUP_ID, football, getCompetitionMeta } from "@/lib/football";

type Tab = "standings" | "knockout" | "fixtures" | "scorers" | "assists";

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "standings", label: "Standings" },
  { id: "fixtures", label: "Fixtures" },
  { id: "scorers", label: "Top Scorers" },
  { id: "assists", label: "Top Assists" },
];

export default function CompetitionPage() {
  const params = useParams();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>("standings");

  const tabs: { id: Tab; label: string }[] =
    id === FIFA_WORLD_CUP_ID
      ? [
          { id: "standings", label: "Standings" },
          { id: "knockout", label: "Knockout" },
          { id: "fixtures", label: "Fixtures" },
          { id: "scorers", label: "Top Scorers" },
          { id: "assists", label: "Top Assists" },
        ]
      : BASE_TABS;

  const meta = getCompetitionMeta(id);
  const standings = useFetch(() => football.standings(id), [id, tab], tab === "standings");
  const knockout = useFetch(() => football.knockout(id), [id, tab], tab === "knockout");
  const fixtures = useFetch(() => football.leagueFixtures(id, 12), [id, tab], tab === "fixtures");
  const scorers = useFetch(() => football.topScorers(id), [id, tab], tab === "scorers");
  const assists = useFetch(() => football.topAssists(id), [id, tab], tab === "assists");

  const wideLayout = tab === "knockout" && id === FIFA_WORLD_CUP_ID;

  return (
    <div className={wideLayout ? "w-full" : "mx-auto max-w-5xl"}>
      <Link
        href="/dashboard/competitions"
        className="mb-4 inline-flex items-center gap-2 text-sm text-athletix-text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Competitions
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
        {meta?.name ?? "Competition"}
      </h1>
      <p className="mb-6 text-sm text-athletix-text-muted">{meta?.country}</p>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-athletix-primary/20 text-athletix-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
                : "bg-white/[0.03] text-athletix-text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "standings" &&
        (standings.loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (standings.data?.length ?? 0) > 0 ? (
          <StandingsGroups groups={standings.data!} columns={id === FIFA_WORLD_CUP_ID ? 2 : 1} />
        ) : (
          <Empty />
        ))}

      {tab === "knockout" &&
        (knockout.loading ? (
          <Skeleton className="h-[700px] w-full rounded-2xl" />
        ) : knockout.data ? (
          <div className="-mx-2 sm:-mx-4">
            <KnockoutBracketView bracket={knockout.data} />
          </div>
        ) : (
          <Empty />
        ))}

      {tab === "fixtures" &&
        (fixtures.loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (fixtures.data?.length ?? 0) > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {fixtures.data!.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        ) : (
          <Empty />
        ))}

      {tab === "scorers" &&
        (scorers.loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (scorers.data?.length ?? 0) > 0 ? (
          <TopScorersList scorers={scorers.data!} limit={20} />
        ) : (
          <Empty />
        ))}

      {tab === "assists" &&
        (assists.loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (assists.data?.length ?? 0) > 0 ? (
          <TopScorersList scorers={assists.data!} limit={20} metric="assists" />
        ) : (
          <Empty />
        ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="auth-glass-card flex items-center justify-center rounded-2xl px-4 py-16 text-center text-sm text-athletix-text-muted">
      Data unavailable for this competition right now.
    </div>
  );
}
