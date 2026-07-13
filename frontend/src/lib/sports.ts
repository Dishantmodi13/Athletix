export const FOOTBALL_DASHBOARD = "/dashboard";
export const CRICKET_DASHBOARD = "/dashboard/cricket";

export function isCricketRoute(pathname: string): boolean {
  return pathname === CRICKET_DASHBOARD || pathname.startsWith(`${CRICKET_DASHBOARD}/`);
}

export function isFootballRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard") && !isCricketRoute(pathname);
}
