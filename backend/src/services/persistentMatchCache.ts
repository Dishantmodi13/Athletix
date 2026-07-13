import fs from "fs/promises";
import path from "path";
import { hasAnyMatchDetails } from "../providers/football/matchQualityUtils";
import {
  lineupStarterCount,
  teamStatisticsTypeCount,
} from "../providers/football/matchMergeUtils";
import type { MatchDetailsResult } from "../providers/football/football.types";

const CACHE_DIR = path.join(process.cwd(), "data", "match-cache");

function cachePath(id: number): string {
  return path.join(CACHE_DIR, `${id}.json`);
}

function shouldPersist(result: MatchDetailsResult): boolean {
  if (!result.match || !hasAnyMatchDetails(result)) return false;
  const finished = ["FT", "AET", "PEN"].includes(result.match.status.short);
  if (!finished) return true;
  return (
    teamStatisticsTypeCount(result.statistics) >= 8 ||
    lineupStarterCount(result.lineups) >= 14
  );
}

export const persistentMatchCache = {
  async get(id: number): Promise<MatchDetailsResult | null> {
    try {
      const raw = await fs.readFile(cachePath(id), "utf8");
      const parsed = JSON.parse(raw) as MatchDetailsResult;
      return parsed?.match ? parsed : null;
    } catch {
      return null;
    }
  },

  async set(id: number, result: MatchDetailsResult): Promise<void> {
    if (!shouldPersist(result)) return;
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath(id), JSON.stringify(result), "utf8");
  },
};
