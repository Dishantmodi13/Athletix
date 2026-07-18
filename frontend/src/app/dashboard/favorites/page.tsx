"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GuestSignInDialog } from "@/components/auth/GuestSignInDialog";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { TeamLogo } from "@/components/dashboard/ui/TeamLogo";
import { Favorite, FAVORITES_CHANGED_EVENT, getFavorites } from "@/lib/favorites";
import { isAuthenticated } from "@/lib/auth";

function favoriteHref(fav: Favorite): string {
  if (fav.type === "competition") {
    return `/dashboard/competitions/${fav.id}`;
  }
  return `/dashboard/${fav.type}/${fav.id}`;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setSignedIn(isAuthenticated());
    const sync = () => setFavorites(getFavorites());
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
  }, []);

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-4xl">
        <SectionHeader title="Favorites" icon={<Heart className="h-5 w-5" />} />
        <div className="auth-glass-card flex flex-col items-center justify-center gap-4 rounded-2xl px-4 py-16 text-center">
          <Heart className="h-10 w-10 text-athletix-text-muted" />
          <p className="max-w-sm text-sm text-athletix-text-muted">
            Sign in to follow teams, players, and competitions. Your favorites will appear here.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="auth-primary-btn rounded-2xl px-6 py-2.5 text-sm font-semibold text-white"
          >
            Sign In to Follow
          </button>
        </div>
        <GuestSignInDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          feature="favorites"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Favorites" icon={<Heart className="h-5 w-5" />} />

      {favorites.length === 0 ? (
        <div className="auth-glass-card flex flex-col items-center justify-center gap-3 rounded-2xl px-4 py-16 text-center">
          <Heart className="h-10 w-10 text-athletix-text-muted" />
          <p className="text-sm text-athletix-text-muted">
            You aren&apos;t following anything yet.
          </p>
          <Link
            href="/dashboard/competitions"
            className="text-sm font-medium text-athletix-primary hover:text-blue-400"
          >
            Explore competitions
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => (
            <button
              key={`${fav.type}-${fav.id}`}
              type="button"
              onClick={() => router.push(favoriteHref(fav))}
              className="auth-glass-card flex items-center gap-3 rounded-2xl p-4 text-left transition-all hover:border-athletix-primary/30"
            >
              <TeamLogo src={fav.logo ?? ""} alt={fav.name} size={36} />
              <div>
                <p className="text-sm font-semibold text-white">{fav.name}</p>
                <p className="text-xs capitalize text-athletix-text-muted">{fav.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
