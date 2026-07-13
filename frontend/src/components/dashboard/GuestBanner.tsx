"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function GuestBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isAuthenticated());
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-athletix-secondary/20 bg-athletix-secondary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-athletix-secondary">
        Sign in from your profile to follow teams, save favorites, and personalize your experience.
      </p>
      <Link
        href="/dashboard/profile"
        className="shrink-0 rounded-xl bg-athletix-primary/15 px-4 py-2 text-center text-sm font-medium text-athletix-primary transition-colors hover:bg-athletix-primary/25"
      >
        Sign In
      </Link>
    </div>
  );
}
