"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCricketRoute } from "@/lib/sports";
import { isNavItemActive } from "./Sidebar";
import { BOTTOM_NAV_ITEMS, CRICKET_BOTTOM_NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const items = isCricketRoute(pathname) ? CRICKET_BOTTOM_NAV_ITEMS : BOTTOM_NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-athletix-bg-deep/90 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-athletix-primary" : "text-athletix-text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
