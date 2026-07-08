"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getAvatarUrl, getUserInitials } from "@/lib/user";

export function ProfileMenu() {
  const { user, isGuest, logout } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const label = user?.username ?? (isGuest ? "Guest" : "Profile");
  const avatarUrl = getAvatarUrl(user?.avatar);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-athletix-primary to-blue-700 text-sm font-bold text-white ring-2 ring-transparent transition-all hover:ring-athletix-primary/40"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getUserInitials(label)
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/[0.08] bg-athletix-bg-surface/95 py-1 shadow-xl backdrop-blur-xl"
        >
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{label}</p>
            {user?.email && (
              <p className="truncate text-xs text-athletix-text-muted">{user.email}</p>
            )}
          </div>

          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-athletix-text-secondary transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>

          {!isGuest && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}

          {isGuest && (
            <Link
              href="/auth"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-athletix-primary transition-colors hover:bg-white/[0.05]"
            >
              <User className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
