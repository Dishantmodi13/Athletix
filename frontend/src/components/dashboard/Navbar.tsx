"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AthletixLogo } from "@/components/auth/AthletixLogo";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";

export function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-athletix-bg-deep/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <div className="lg:hidden">
          <Link href="/dashboard">
            <AthletixLogo size="sm" />
          </Link>
        </div>

        <form onSubmit={handleSearch} className="relative ml-auto hidden max-w-md flex-1 sm:block lg:ml-0">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-athletix-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, players, competitions..."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-athletix-text-muted focus:border-athletix-primary/40"
            aria-label="Search"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link
            href="/dashboard/search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-athletix-text-muted transition-colors hover:text-white sm:hidden"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-athletix-text-muted transition-colors hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-athletix-secondary" />
          </button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
