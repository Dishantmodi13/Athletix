import type { NormalizedPlayerProfile } from "./playerProfile.types";

interface AfProfilePlayer {
  id?: number;
  name?: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  birth?: { date?: string; place?: string; country?: string };
  nationality?: string;
  height?: string | number;
  weight?: string | number;
  number?: number;
  position?: string;
  photo?: string;
}

interface AfPlayerWithStats {
  player?: AfProfilePlayer;
  statistics?: Array<{
    team?: { id?: number; name?: string; logo?: string };
    league?: { name?: string; season?: number };
    games?: { appearences?: number | null; position?: string | null };
    goals?: { total?: number | null; assists?: number | null };
    cards?: { yellow?: number | null; red?: number | null };
  }>;
}

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

function formatHeight(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw.endsWith("cm") || raw.includes("m") ? raw : `${raw} cm`;
}

function formatWeight(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw.toLowerCase().includes("kg") || raw.toLowerCase().includes("lb")
    ? raw
    : `${raw} kg`;
}

function ageFromBirth(date: string | null | undefined): number | null {
  if (!date) return null;
  const born = new Date(date);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    age--;
  }
  return age;
}

function mapAfStatistics(stats: AfPlayerWithStats["statistics"]): NormalizedPlayerProfile["statistics"] {
  return (stats ?? []).map((row) => ({
    team: {
      id: row.team?.id ?? 0,
      name: row.team?.name ?? "",
      logo: row.team?.logo ?? "",
    },
    league: {
      name: row.league?.name ?? "",
      season: row.league?.season ?? 0,
    },
    games: {
      appearences: row.games?.appearences ?? null,
      position: row.games?.position ?? null,
    },
    goals: {
      total: row.goals?.total ?? null,
      assists: row.goals?.assists ?? null,
    },
    cards: {
      yellow: row.cards?.yellow ?? null,
      red: row.cards?.red ?? null,
    },
  }));
}

export function normalizeApiFootballPlayer(
  profile: AfProfilePlayer | null | undefined,
  statsRow: AfPlayerWithStats | null | undefined,
  fallbackId: number
): NormalizedPlayerProfile | null {
  const player = profile ?? statsRow?.player;
  if (!player?.name && !player?.firstname) return null;

  const id = player.id ?? fallbackId;
  const statistics = mapAfStatistics(statsRow?.statistics);

  return {
    player: {
      id,
      name: player.name ?? `${player.firstname ?? ""} ${player.lastname ?? ""}`.trim(),
      firstname: player.firstname ?? "",
      lastname: player.lastname ?? "",
      age: player.age ?? ageFromBirth(player.birth?.date),
      nationality: player.nationality ?? "",
      height: formatHeight(player.height),
      weight: formatWeight(player.weight),
      photo: player.photo ?? "",
      birth: {
        date: player.birth?.date ?? null,
        place: player.birth?.place ?? null,
        country: player.birth?.country ?? null,
      },
      position: player.position ?? statistics[0]?.games.position ?? null,
      number: player.number ?? null,
    },
    statistics,
    source: "api-football",
  };
}

export function normalizeTheSportsDbPlayer(
  raw: TsdbPlayer,
  fallbackId: number
): NormalizedPlayerProfile | null {
  if (!raw.strPlayer?.trim()) return null;

  const id = Number(raw.idAPIfootball) || Number(raw.idPlayer) || fallbackId;
  const teamName = raw.strTeam?.replace(/^_/, "").trim() || "";
  const club =
    teamName && !teamName.toLowerCase().includes("free agent")
      ? { name: teamName, logo: raw.strTeamBadge ?? "" }
      : undefined;

  return {
    player: {
      id,
      name: raw.strPlayer,
      firstname: raw.strFirstName ?? "",
      lastname: raw.strLastName ?? "",
      age: ageFromBirth(raw.dateBorn),
      nationality: raw.strNationality ?? "",
      height: raw.strHeight ?? null,
      weight: raw.strWeight ?? null,
      photo: raw.strCutout ?? raw.strThumb ?? "",
      birth: {
        date: raw.dateBorn ?? null,
        place: raw.strBirthLocation ?? null,
        country: raw.strNationality ?? null,
      },
      position: raw.strPosition ?? null,
      number: raw.strNumber ? Number(raw.strNumber) : null,
    },
    club,
    statistics: teamName
      ? [
          {
            team: { id: 0, name: teamName, logo: raw.strTeamBadge ?? "" },
            league: { name: "Club", season: 0 },
            games: { appearences: null, position: raw.strPosition ?? null },
            goals: { total: null, assists: null },
            cards: { yellow: null, red: null },
          },
        ]
      : [],
    source: "thesportsdb",
  };
}
