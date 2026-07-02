"use client";

import { BottomNav } from "@/components/dashboard/BottomNav";
import { GuestBanner } from "@/components/dashboard/GuestBanner";
import { Navbar } from "@/components/dashboard/Navbar";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-athletix-bg-deep text-white">
      <div className="flex">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <div className="flex min-w-0 flex-1">
            <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
              <GuestBanner />
              {children}
            </main>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
