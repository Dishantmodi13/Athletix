"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasSessionStarted } from "@/lib/session";

export function DashboardSessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (hasSessionStarted()) {
      setAllowed(true);
      return;
    }

    router.replace("/");
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-athletix-bg-deep">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-athletix-primary/30 border-t-athletix-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
