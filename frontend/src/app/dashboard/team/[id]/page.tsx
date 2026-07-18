"use client";

import { Suspense } from "react";
import { TeamPageContent } from "./TeamPageContent";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";

function TeamPageFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamPageFallback />}>
      <TeamPageContent />
    </Suspense>
  );
}
