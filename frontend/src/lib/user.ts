import { API_URL } from "./api";
import { AUTH_TOKEN_KEY, USER_STORAGE_KEY } from "./auth";
import type { FollowedTeam } from "@/types/followedTeam";
import type { UpdateProfilePayload, UserProfile } from "@/types/user";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "Request failed");
  }

  return body.data as T;
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return authRequest<UserProfile>("/users/me");
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  return authRequest<UserProfile>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function followTeamOnServer(team: FollowedTeam): Promise<UserProfile> {
  return authRequest<UserProfile>("/users/me/followed-teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export async function unfollowTeamOnServer(teamId: number): Promise<UserProfile> {
  return authRequest<UserProfile>(`/users/me/followed-teams/${teamId}`, {
    method: "DELETE",
  });
}

export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${avatar}`;
}

export function getUserInitials(username: string): string {
  const parts = username.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (username.slice(0, 2) || "A").toUpperCase();
}

export function saveUserProfile(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function loadUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    return {
      ...parsed,
      followedTeams: parsed.followedTeams ?? [],
    };
  } catch {
    return null;
  }
}

export function clearUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}
