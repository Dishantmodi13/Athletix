import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "data", "league-cache");

function cachePath(key: string): string {
  const safe = key.replace(/:/g, "-").replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export const persistentLeagueCache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(cachePath(key), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath(key), JSON.stringify(value), "utf8");
  },
};
