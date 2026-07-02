"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AthletixLogo } from "@/components/auth/AthletixLogo";
import { SIDEBAR_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/[0.06] bg-athletix-bg-mid/40 px-4 py-6 lg:flex">
      <div className="mb-8 px-2">
        <Link href="/dashboard">
          <AthletixLogo size="sm" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
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
