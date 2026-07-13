"use client";

import { BottomNav } from "@/components/dashboard/BottomNav";
import { GuestBanner } from "@/components/dashboard/GuestBanner";
import { Navbar } from "@/components/dashboard/Navbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UserProvider } from "@/context/UserContext";
import { isCricketRoute } from "@/lib/sports";
import { usePathname } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cricket = isCricketRoute(pathname);

  return (
    <UserProvider>
      <div className="min-h-dvh bg-athletix-bg-deep text-white">
        <div className="flex">
          {!cricket && <Sidebar />}
          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar />
            <div className="flex min-w-0 flex-1">
              <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
                {!cricket && <GuestBanner />}
                {children}
              </main>
            </div>
          </div>
        </div>
        {!cricket && <BottomNav />}
      </div>
    </UserProvider>
  );
}
