import type { FollowedTeam } from "@/types/followedTeam";

export type FavoriteType = "team" | "player" | "competition";

export interface Favorite {
  type: FavoriteType;
  id: number;
  name: string;
  logo?: string;
}

const KEY = "athletix-favorites";
export const FAVORITES_CHANGED_EVENT = "athletix-favorites-changed";

function read(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Favorite[];
  } catch {
    return [];
  }
}

function write(items: Favorite[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function getFavorites(type?: FavoriteType): Favorite[] {
  const all = read();
  return type ? all.filter((f) => f.type === type) : all;
}

export function getFollowedTeams(): FollowedTeam[] {
  return getFavorites("team").map((team) => ({
    id: team.id,
    name: team.name,
    logo: team.logo ?? null,
  }));
}

export function isFavorite(type: FavoriteType, id: number): boolean {
  return read().some((f) => f.type === type && f.id === id);
}

export function isFollowingTeam(id: number): boolean {
  return isFavorite("team", id);
}

export function toggleFavorite(fav: Favorite): boolean {
  const all = read();
  const exists = all.some((f) => f.type === fav.type && f.id === fav.id);
  if (exists) {
    write(all.filter((f) => !(f.type === fav.type && f.id === fav.id)));
    return false;
  }
  write([...all, fav]);
  return true;
}

export function setFollowedTeams(teams: FollowedTeam[]): void {
  const others = read().filter((f) => f.type !== "team");
  const teamFavorites: Favorite[] = teams.map((team) => ({
    type: "team",
    id: team.id,
    name: team.name,
    logo: team.logo ?? undefined,
  }));
  write([...others, ...teamFavorites]);
}

export function removeFollowedTeam(id: number): void {
  write(read().filter((f) => !(f.type === "team" && f.id === id)));
}
