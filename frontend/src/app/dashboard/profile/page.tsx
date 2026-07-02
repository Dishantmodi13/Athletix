"use client";

import { LogIn, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { disableGuestMode, isGuestMode } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(isGuestMode());
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("athletix-token");
      disableGuestMode();
    }
    router.push("/auth");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader title="Profile" icon={<User className="h-5 w-5" />} />

      <div className="auth-glass-card mb-6 flex items-center gap-4 rounded-2xl p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-athletix-primary to-blue-700 text-2xl font-bold text-white">
          {guest ? "G" : "A"}
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            {guest ? "Guest" : "Athletix Member"}
          </p>
          <p className="text-sm text-athletix-text-muted">
            {guest
              ? "Sign in to save favorites and personalize your feed"
              : "Premium football companion"}
          </p>
        </div>
      </div>

      {guest ? (
        <Link
          href="/auth"
          className="auth-primary-btn flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
        >
          <LogIn className="h-4 w-4" /> Sign In
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      )}
    </div>
  );
}
