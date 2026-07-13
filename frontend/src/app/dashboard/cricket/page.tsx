import { CircleDot } from "lucide-react";

export default function CricketDashboardPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-athletix-secondary/15 text-athletix-secondary">
        <CircleDot className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Cricket Dashboard</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-athletix-text-muted">
        Live scores, fixtures, and stats for cricket are coming soon. Switch to Football for the full
        experience.
      </p>
    </div>
  );
}
