import {
  getActiveFeaturedSeries,
  getFastLiveMatches,
  getLeagueMatches,
  getMatchDetails,
  isOngoingSeries,
  isSeniorFeaturedSeries,
} from "../providers/cricket/espnCricket.provider";
import type {
  CricketCompetition,
  CricketMatch,
  CricketMatchDetails,
  CricketSeries,
} from "../providers/cricket/cricket.types";
import { cache } from "./cache.service";

/** Marquee competitions always shown on the competitions page. */
const FEATURED_COMPETITIONS: Array<{
  leagueId: string | null;
  name: string;
  description: string;
  category: "icc" | "league";
}> = [
  {
    leagueId: "8048",
    name: "Indian Premier League",
    description: "The world's biggest T20 franchise league.",
    category: "league",
  },
  {
    leagueId: "8044",
    name: "Big Bash League",
    description: "Australia's premier T20 competition.",
    category: "league",
  },
  {
    leagueId: "8039",
    name: "ICC Cricket World Cup",
    description: "The 50-over world championship.",
    category: "icc",
  },
  {
    leagueId: null,
    name: "ICC Men's T20 World Cup",
    description: "The global T20 showpiece tournament.",
    category: "icc",
  },
  {
    leagueId: null,
    name: "ICC Champions Trophy",
    description: "Elite ODI tournament between top-ranked nations.",
    category: "icc",
  },
  {
    leagueId: null,
    name: "ICC World Test Championship",
    description: "The pinnacle of the longest format.",
    category: "icc",
  },
];

const FEATURED_CACHE_TTL = 600;
const LIVE_CACHE_TTL = 30;

function sortMatches(matches: CricketMatch[]): CricketMatch[] {
  const stateRank = { live: 0, upcoming: 1, finished: 2 } as const;
  return [...matches].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.state !== b.state) return stateRank[a.state] - stateRank[b.state];
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return a.state === "finished" ? tb - ta : ta - tb;
  });
}

function sortSeries(series: CricketSeries[]): CricketSeries[] {
  return [...series].sort((a, b) => {
    const liveA = a.matches.some((m) => m.state === "live");
    const liveB = b.matches.some((m) => m.state === "live");
    if (liveA !== liveB) return liveA ? -1 : 1;

    const nextA = a.matches.find((m) => m.state !== "finished");
    const nextB = b.matches.find((m) => m.state !== "finished");
    const ta = nextA ? new Date(nextA.date).getTime() : 0;
    const tb = nextB ? new Date(nextB.date).getTime() : 0;
    if (ta !== tb) return ta - tb;

    return b.matches.length - a.matches.length;
  });
}

async function loadFeaturedSeries(): Promise<CricketSeries[]> {
  return cache.wrapStale("cricket:featured:v6", FEATURED_CACHE_TTL, () =>
    getActiveFeaturedSeries()
  );
}

function featuredSeriesList(series: CricketSeries[]): CricketSeries[] {
  return sortSeries(
    series
      .filter((s) => {
        const teamNames = s.matches.flatMap((m) => m.teams.map((t) => t.name));
        return isSeniorFeaturedSeries(s.name, teamNames) && isOngoingSeries(s.matches);
      })
      .map((s) => ({
        ...s,
        matches: sortMatches(
          s.matches.filter(
            (m) => m.state === "live" || m.state === "upcoming" || m.state === "finished"
          )
        ),
      }))
  );
}

function allMatches(series: CricketSeries[]): CricketMatch[] {
  return series.flatMap((s) => s.matches);
}

export const cricketService = {
  /** Combined payload for the cricket home page (one round-trip). */
  getHome: async () => {
    const [live, featured] = await Promise.all([
      cache.wrap("cricket:live:v2", LIVE_CACHE_TTL, () => getFastLiveMatches()),
      featuredSeriesList(await loadFeaturedSeries()),
    ]);
    return { live: sortMatches(live), featured };
  },

  getMatches: async () => {
    const series = await loadFeaturedSeries();
    return sortMatches(allMatches(series));
  },

  getLiveMatches: async () => {
    return cache.wrap("cricket:live:v2", LIVE_CACHE_TTL, () => getFastLiveMatches());
  },

  getFixtures: async () => {
    const series = await loadFeaturedSeries();
    const matches = allMatches(series).filter((m) => m.state !== "finished");
    return sortMatches(matches);
  },

  getSeries: async () => {
    const series = await loadFeaturedSeries();
    return sortSeries(series.map((s) => ({ ...s, matches: sortMatches(s.matches) })));
  },

  getFeaturedSeries: async () => featuredSeriesList(await loadFeaturedSeries()),

  getCompetitions: async (): Promise<{
    featured: CricketCompetition[];
    active: CricketSeries[];
  }> => {
    const [series, featured] = await Promise.all([
      loadFeaturedSeries(),
      Promise.all(
        FEATURED_COMPETITIONS.map(async (comp) => {
          if (!comp.leagueId) {
            return { ...comp, matches: [] };
          }
          const matches = await cache
            .wrap(`cricket:league:v2:${comp.leagueId}`, 600, () =>
              getLeagueMatches(comp.leagueId!)
            )
            .catch(() => [] as CricketMatch[]);
          return { ...comp, matches: sortMatches(matches) };
        })
      ),
    ]);

    return { featured, active: featuredSeriesList(series) };
  },

  getMatchDetails: async (
    leagueId: string,
    eventId: string
  ): Promise<CricketMatchDetails> => {
    const key = `cricket:match:v4:${leagueId}:${eventId}`;
    const details = await cache.wrap(key, 30, () =>
      getMatchDetails(leagueId, eventId)
    );

    if (details.match?.state === "finished") {
      cache.set(key, details, 6 * 3600);
    }

    return details;
  },
};
