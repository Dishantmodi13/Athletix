import { disableGuestMode, AUTH_CHANGE_EVENT } from "./auth";
import type { UserProfile } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const body = (await response.json()) as ApiResponse<T> & { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Something went wrong");
  }

  return body.data as T;
}

export async function sendOtp(email: string) {
  return apiRequest<{
    email: string;
    expiresInMinutes: number;
    delivered?: boolean;
  }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email: string, otp: string) {
  return apiRequest<{
    user: UserProfile;
    token: string;
  }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function saveAuthToken(token: string) {
  if (typeof window !== "undefined") {
    disableGuestMode();
    localStorage.setItem("athletix-token", token);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export { API_URL };
