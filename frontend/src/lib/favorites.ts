export type FavoriteType = "team" | "player" | "competition";

export interface Favorite {
  type: FavoriteType;
  id: number;
  name: string;
  logo?: string;
}

const KEY = "athletix-favorites";

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
  window.dispatchEvent(new Event("athletix-favorites-changed"));
}

export function getFavorites(type?: FavoriteType): Favorite[] {
  const all = read();
  return type ? all.filter((f) => f.type === type) : all;
}

export function isFavorite(type: FavoriteType, id: number): boolean {
  return read().some((f) => f.type === type && f.id === id);
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
