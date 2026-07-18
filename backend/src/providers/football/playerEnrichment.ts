import { cache } from "../../services/cache.service";
import { footballDataProvider } from "./footballData.provider";
import { loadTopAssists } from "./topAssistsResolver";
import { WORLD_CUP_LEAGUE_ID } from "./leagueMap";
import type { NormalizedPlayerProfile } from "./playerProfile.types";
import { theSportsDbPlayerProvider } from "./theSportsDbPlayer.provider";
import type { TopScorer } from "./football.types";
import { footballProviderManager } from "./footballProvider.manager";
import { resolveFootballSeason } from "../../utils/footballSeason";

function namesCompatible(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z]/g, "");
  if (!na || !nb) return false;
  if (na === nb) return true;

  const lastA = a.trim().split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const lastB = b.trim().split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  if (lastA && lastB && lastA === lastB) return true;

  return na.includes(nb) || nb.includes(na);
}

function displayName(profile: NormalizedPlayerProfile): string {
  const full = `${profile.player.firstname} ${profile.player.lastname}`.trim();
  return full || profile.player.name;
}

function findScorerRow(
  rows: TopScorer[],
  playerId: number,
  name: string
): TopScorer | undefined {
  return (
    rows.find((row) => row.player.id === playerId) ??
    rows.find((row) => namesCompatible(row.player.name, name))
  );
}

async function getScorerCatalog(
  leagueId: number,
  season: number
): Promise<{ scorers: TopScorer[]; assists: TopScorer[] }> {
  const cacheKey = `player-scorer-catalog:v3:${leagueId}:${season}`;
  const cached = cache.get<{ scorers: TopScorer[]; assists: TopScorer[] }>(cacheKey);
  if (cached) return cached;

  try {
    const scorers = await footballProviderManager.execute(
      "getTopScorers",
      leagueId,
      season
    );

    let assists: TopScorer[] = [];
    const loaded = await loadTopAssists(leagueId, season);
    if (loaded.length > 0) {
      assists = loaded;
    }

    const payload = { scorers, assists };
    if (scorers.length > 0 || assists.length > 0) {
      cache.set(cacheKey, payload, 3600);
    }
    return payload;
  } catch {
    return { scorers: [], assists: [] };
  }
}

function statRowFromScorer(
  scorer: TopScorer,
  leagueName: string,
  season: number,
  assistsOverride?: number | null
): NormalizedPlayerProfile["statistics"][number] {
  const stat = scorer.statistics[0];
  return {
    team: {
      id: stat?.team.id ?? 0,
      name: stat?.team.name ?? "",
      logo: stat?.team.logo ?? "",
    },
    league: { name: leagueName, season },
    games: {
      appearences: stat?.games.appearences ?? null,
      position: null,
    },
    goals: {
      total: stat?.goals.total ?? null,
      assists: assistsOverride ?? stat?.goals.assists ?? null,
    },
    cards: { yellow: null, red: null },
  };
}

function hasMeaningfulStats(stats: NormalizedPlayerProfile["statistics"]): boolean {
  return stats.some(
    (row) =>
      (row.goals.total ?? 0) > 0 ||
      (row.goals.assists ?? 0) > 0 ||
      (row.games.appearences ?? 0) > 0
  );
}

function mergeStatistics(
  base: NormalizedPlayerProfile["statistics"],
  extra: NormalizedPlayerProfile["statistics"]
): NormalizedPlayerProfile["statistics"] {
  const merged = [...base];
  for (const row of extra) {
    const exists = merged.some(
      (existing) =>
        existing.league.name === row.league.name &&
        existing.league.season === row.league.season &&
        existing.team.name === row.team.name
    );
    if (!exists) merged.push(row);
  }
  return merged;
}

export async function enrichPlayerProfile(
  profile: NormalizedPlayerProfile | null,
  playerId: number,
  name?: string
): Promise<NormalizedPlayerProfile | null> {
  if (!profile && !name?.trim()) return null;

  let result: NormalizedPlayerProfile =
    profile ??
    ({
      player: {
        id: playerId,
        name: name!.trim(),
        firstname: "",
        lastname: "",
        age: null,
        nationality: "",
        height: null,
        weight: null,
        photo: "",
        birth: { date: null },
      },
      statistics: [],
      source: "merged",
    } satisfies NormalizedPlayerProfile);

  const lookupName = name?.trim() || displayName(result);

  if (lookupName) {
    const tsdb = await theSportsDbPlayerProvider.getPlayerByName(lookupName, playerId);
    if (tsdb) {
      if (!profile) {
        result = { ...tsdb, player: { ...tsdb.player, id: playerId } };
      } else {
        result = {
          ...result,
          player: {
            ...result.player,
            photo: result.player.photo || tsdb.player.photo,
            height: result.player.height ?? tsdb.player.height,
            weight: result.player.weight ?? tsdb.player.weight,
            position: result.player.position ?? tsdb.player.position,
            nationality: result.player.nationality || tsdb.player.nationality,
          },
          club: result.club ?? tsdb.club,
        };
      }
      if (tsdb.club?.name) {
        result.club = tsdb.club;
      }
    }
  }

  const wcSeason = resolveFootballSeason(undefined, WORLD_CUP_LEAGUE_ID);
  const { scorers, assists } = await getScorerCatalog(WORLD_CUP_LEAGUE_ID, wcSeason);
  const scorerName = displayName(result);
  const scorerRow = findScorerRow(scorers, playerId, scorerName);
  const assistRow = findScorerRow(assists, playerId, scorerName);

  if (scorerRow) {
    const wcStats = statRowFromScorer(
      scorerRow,
      "FIFA World Cup",
      wcSeason,
      assistRow?.statistics[0]?.goals.assists ?? scorerRow.statistics[0]?.goals.assists
    );
    result.statistics = mergeStatistics(result.statistics, [wcStats]);
  } else if (assistRow) {
    const wcStats = statRowFromScorer(assistRow, "FIFA World Cup", wcSeason);
    result.statistics = mergeStatistics(result.statistics, [wcStats]);
  }

  if (!hasMeaningfulStats(result.statistics)) {
    const plSeason = resolveFootballSeason();
    const plCatalog = await getScorerCatalog(39, plSeason);
    const plScorer = findScorerRow(plCatalog.scorers, playerId, scorerName);
    const plAssist = findScorerRow(plCatalog.assists, playerId, scorerName);
    if (plScorer) {
      result.statistics = mergeStatistics(result.statistics, [
        statRowFromScorer(
          plScorer,
          "Premier League",
          plSeason,
          plAssist?.statistics[0]?.goals.assists ?? plScorer.statistics[0]?.goals.assists
        ),
      ]);
    }
  }

  result.source = profile?.source ? `${profile.source}+enriched` : "enriched";
  return result;
}
