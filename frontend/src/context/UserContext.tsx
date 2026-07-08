"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, isAuthenticated, isGuestMode } from "@/lib/auth";
import {
  fetchCurrentUser,
  loadUserProfile,
  saveUserProfile,
  updateUserProfile,
} from "@/lib/user";
import type { UpdateProfilePayload, UserProfile } from "@/types/user";

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated() || isGuestMode()) {
      setUser(null);
      setIsGuest(isGuestMode());
      return;
    }

    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      saveUserProfile(profile);
      setIsGuest(false);
    } catch {
      const cached = loadUserProfile();
      setUser(cached);
    }
  }, []);

  useEffect(() => {
    const guest = isGuestMode();
    setIsGuest(guest);

    if (guest || !isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const cached = loadUserProfile();
    if (cached) setUser(cached);

    fetchCurrentUser()
      .then((profile) => {
        setUser(profile);
        saveUserProfile(profile);
      })
      .catch(() => {
        if (!cached) setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await updateUserProfile(payload);
    setUser(updated);
    saveUserProfile(updated);
    return updated;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setIsGuest(false);
    router.push("/auth");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, isGuest, refreshUser, updateProfile, logout }),
    [user, loading, isGuest, refreshUser, updateProfile, logout]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
