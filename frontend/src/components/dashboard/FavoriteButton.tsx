"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { GuestSignInDialog } from "@/components/auth/GuestSignInDialog";
import { Favorite, isFavorite, toggleFavorite } from "@/lib/favorites";
import { isGuestMode } from "@/lib/auth";

interface FavoriteButtonProps {
  favorite: Favorite;
}

export function FavoriteButton({ favorite }: FavoriteButtonProps) {
  const [active, setActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setActive(isFavorite(favorite.type, favorite.id));
  }, [favorite.type, favorite.id]);

  const handleClick = () => {
    if (isGuestMode()) {
      setDialogOpen(true);
      return;
    }
    setActive(toggleFavorite(favorite));
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
          active
            ? "border-athletix-secondary/40 bg-athletix-secondary/15 text-athletix-secondary"
            : "border-white/[0.08] bg-white/[0.03] text-athletix-text-muted hover:text-white"
        }`}
        aria-pressed={active}
      >
        <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
        {active ? "Following" : "Follow"}
      </button>
      <GuestSignInDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        feature="following teams and players"
      />
    </>
  );
}
