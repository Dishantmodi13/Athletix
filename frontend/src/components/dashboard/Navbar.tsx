"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AthletixLogo } from "@/components/auth/AthletixLogo";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";
import { CRICKET_DASHBOARD, FOOTBALL_DASHBOARD, isCricketRoute, isFootballRoute } from "@/lib/sports";

const SPORT_TABS = [
  { label: "Football", href: FOOTBALL_DASHBOARD },
  { label: "Cricket", href: CRICKET_DASHBOARD },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-athletix-bg-deep/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <div className="lg:hidden">
          <Link href={isCricketRoute(pathname) ? CRICKET_DASHBOARD : FOOTBALL_DASHBOARD}>
            <AthletixLogo size="sm" />
          </Link>
        </div>

        <nav
          className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1"
          aria-label="Sports"
        >
          {SPORT_TABS.map((tab) => {
            const active =
              tab.href === CRICKET_DASHBOARD
                ? isCricketRoute(pathname)
                : isFootballRoute(pathname);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-athletix-primary/20 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
                    : "text-athletix-text-muted hover:bg-white/[0.04] hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
