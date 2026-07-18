export const SESSION_STARTED_KEY = "athletix-session-started";

export function hasSessionStarted(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_STARTED_KEY) === "true";
}

export function markSessionStarted(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_STARTED_KEY, "true");
}
