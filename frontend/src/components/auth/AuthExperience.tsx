"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "./AuthCard";
import { AuthLayout } from "./AuthLayout";
import { hasSessionStarted } from "@/lib/session";

export function AuthExperience() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasSessionStarted()) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <AuthLayout>
      <AuthCard />
    </AuthLayout>
  );
}
