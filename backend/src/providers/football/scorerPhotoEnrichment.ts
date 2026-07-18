import { cache } from "../../services/cache.service";
import { theSportsDbPlayerProvider } from "./theSportsDbPlayer.provider";
import type { TopScorer } from "./football.types";
import { mergeScorerPhotos } from "./scorerPhotoUtils";

async function enrichRowFromTheSportsDb(row: TopScorer): Promise<TopScorer> {
  if (row.player.photo?.trim()) return row;

  try {
    const profile = await theSportsDbPlayerProvider.getPlayerByName(
      row.player.name,
      row.player.id > 0 ? row.player.id : undefined
    );
    const photo = profile?.player.photo?.trim();
    if (!photo || !profile) return row;

    return {
      ...row,
      player: {
        ...row.player,
        id: profile.player.id || row.player.id,
        photo,
        nationality: row.player.nationality || profile.player.nationality,
      },
    };
  } catch {
    return row;
  }
}

/** Fill missing scorer photos using TheSportsDB (rate-friendly, top rows only). */
export async function enrichScorerPhotosFromTheSportsDb(
  rows: TopScorer[],
  limit = 30
): Promise<TopScorer[]> {
  if (!rows.length) return rows;

  const enriched = [...rows];
  const targets = enriched
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.player.photo?.trim())
    .slice(0, limit);

  for (const { index } of targets) {
    enriched[index] = await enrichRowFromTheSportsDb(enriched[index]!);
  }

  return enriched;
}

export async function enrichTopScorerPhotos(
  rows: TopScorer[],
  league: number,
  season: number,
  catalogLoader: () => Promise<TopScorer[]>
): Promise<TopScorer[]> {
  if (!rows.length) return rows;

  let enriched = rows;
  const catalogKey = `af:photo-catalog:v1:${league}:${season}`;

  try {
    const catalog = await catalogLoader();
    enriched = mergeScorerPhotos(enriched, catalog);
  } catch {
    const stale = cache.getStale<TopScorer[]>(catalogKey);
    if (stale?.length) {
      enriched = mergeScorerPhotos(enriched, stale);
    }
  }

  if (enriched.some((row) => !row.player.photo?.trim())) {
    enriched = await enrichScorerPhotosFromTheSportsDb(enriched);
  }

  return enriched;
}
