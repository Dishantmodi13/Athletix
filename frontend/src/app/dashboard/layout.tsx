import type { Metadata } from "next";
import { DashboardSessionGuard } from "@/components/dashboard/DashboardSessionGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard | Athletix",
  description: "Live football scores, fixtures, standings, and stats on Athletix.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSessionGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardSessionGuard>
  );
}
