"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AthletixLogo } from "@/components/auth/AthletixLogo";
import { CRICKET_DASHBOARD, FOOTBALL_DASHBOARD, isCricketRoute } from "@/lib/sports";
import { CRICKET_SIDEBAR_ITEMS, SIDEBAR_ITEMS } from "./nav-items";

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === FOOTBALL_DASHBOARD || href === CRICKET_DASHBOARD) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const cricket = isCricketRoute(pathname);
  const items = cricket ? CRICKET_SIDEBAR_ITEMS : SIDEBAR_ITEMS;

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/[0.06] bg-athletix-bg-mid/40 px-4 py-6 lg:flex">
      <div className="mb-8 px-2">
        <Link href={cricket ? CRICKET_DASHBOARD : FOOTBALL_DASHBOARD}>
          <AthletixLogo size="sm" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-athletix-primary/15 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"
                  : "text-athletix-text-muted hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] transition-colors ${
                  active ? "text-athletix-primary" : "text-athletix-text-muted group-hover:text-white"
                }`}
              />
              {item.label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-athletix-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-xs font-medium text-white">Athletix Pro</p>
        <p className="mt-1 text-xs leading-relaxed text-athletix-text-muted">
          AI insights, deeper stats, and personalized alerts.
        </p>
      </div>
    </aside>
  );
}
