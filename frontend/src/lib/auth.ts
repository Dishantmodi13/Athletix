export const GUEST_STORAGE_KEY = "athletix-guest";
export const AUTH_TOKEN_KEY = "athletix-token";
export const USER_STORAGE_KEY = "athletix-user";

export function enableGuestMode() {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_STORAGE_KEY, "true");
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function disableGuestMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_STORAGE_KEY);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(GUEST_STORAGE_KEY);
}

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_STORAGE_KEY) === "true";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}
