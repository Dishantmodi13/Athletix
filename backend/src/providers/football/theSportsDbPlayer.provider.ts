import { env } from "../../config/env";
import { cache } from "../../services/cache.service";
import { normalizeTheSportsDbPlayer } from "./playerProfileUtils";
import type { NormalizedPlayerProfile } from "./playerProfile.types";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

interface TsdbPlayer {
  idPlayer?: string;
  idAPIfootball?: string | null;
  strPlayer?: string;
  strFirstName?: string;
  strLastName?: string;
  strNationality?: string;
  dateBorn?: string | null;
  strBirthLocation?: string | null;
  strHeight?: string | null;
  strWeight?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
  strPosition?: string | null;
  strNumber?: string | null;
  strTeam?: string | null;
  strTeamBadge?: string | null;
}

function apiKey(): string {
  return env.theSportsDbApiKey.trim() || "3";
}

async function tsdbGet<T>(endpoint: string, ttlSeconds = 86_400): Promise<T> {
  const url = `${BASE_URL}/${apiKey()}/${endpoint}`;
  const cacheKey = `tsdb:${url}`;
  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    throw new Error(`TheSportsDB HTTP ${res.status}`);
  }

  const body = (await res.json()) as T;
  cache.set(cacheKey, body, ttlSeconds);
  return body;
}

function namesCompatible(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z]/g, "");
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function pickPlayer(
  players: TsdbPlayer[],
  name: string,
  apiFootballId?: number
): TsdbPlayer | null {
  if (!players.length) return null;

  if (apiFootballId) {
    const byAf = players.find((p) => Number(p.idAPIfootball) === apiFootballId);
    if (byAf) return byAf;
  }

  const exact = players.find((p) => namesCompatible(p.strPlayer ?? "", name));
  if (exact) return exact;

  const lastName = name.trim().split(/\s+/).pop() ?? name;
  const byLast = players.find((p) =>
    namesCompatible(p.strPlayer ?? "", lastName)
  );
  return byLast ?? players[0] ?? null;
}

export class TheSportsDbPlayerProvider {
  private async teamBadge(teamName: string): Promise<string> {
    if (!teamName.trim()) return "";
    try {
      const data = await tsdbGet<{ teams: Array<{ strTeamBadge?: string }> | null }>(
        `searchteams.php?t=${encodeURIComponent(teamName)}`,
        86_400
      );
      const badge = data.teams?.[0]?.strTeamBadge ?? "";
      return badge;
    } catch {
      return "";
    }
  }

  async getPlayerByName(
    name: string,
    apiFootballId?: number
  ): Promise<NormalizedPlayerProfile | null> {
    const query = name.trim();
    if (!query) return null;

    try {
      const search = await tsdbGet<{ player: TsdbPlayer[] | null }>(
        `searchplayers.php?p=${encodeURIComponent(query)}`
      );
      const found = pickPlayer(search.player ?? [], query, apiFootballId);
      if (!found?.idPlayer) return null;

      const detail = await tsdbGet<{ players: TsdbPlayer[] | null }>(
        `lookupplayer.php?id=${found.idPlayer}`
      );
      const player = detail.players?.[0] ?? found;
      const teamName = player.strTeam?.replace(/^_/, "").trim() || "";
      const badge = player.strTeamBadge || (teamName ? await this.teamBadge(teamName) : "");
      if (badge && teamName) {
        player.strTeamBadge = badge;
      }
      return normalizeTheSportsDbPlayer(player, apiFootballId ?? Number(found.idPlayer));
    } catch {
      return null;
    }
  }
}

export const theSportsDbPlayerProvider = new TheSportsDbPlayerProvider();
