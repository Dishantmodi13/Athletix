"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { GuestSignInDialog } from "@/components/auth/GuestSignInDialog";
import { useFollowedTeams } from "@/hooks/useFollowedTeams";
import { Favorite } from "@/lib/favorites";
import { isAuthenticated } from "@/lib/auth";

interface FavoriteButtonProps {
  favorite: Favorite;
}

export function FavoriteButton({ favorite }: FavoriteButtonProps) {
  const { isFollowing, followTeam, unfollowTeam } = useFollowedTeams();
  const [active, setActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (favorite.type === "team") {
      setActive(isFollowing(favorite.id, favorite.name));
    }
  }, [favorite.id, favorite.name, favorite.type, isFollowing]);

  const handleClick = async () => {
    if (!isAuthenticated()) {
      setDialogOpen(true);
      return;
    }

    if (favorite.type !== "team") return;

    setLoading(true);
    try {
      if (active) {
        await unfollowTeam(favorite.id);
        setActive(false);
      } else {
        await followTeam({
          id: favorite.id,
          name: favorite.name,
          logo: favorite.logo ?? null,
        });
        setActive(true);
      }
    } catch {
      setActive(isFollowing(favorite.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all disabled:opacity-60 ${
          active
            ? "border-athletix-secondary/40 bg-athletix-secondary/15 text-athletix-secondary"
            : "border-white/[0.08] bg-white/[0.03] text-athletix-text-muted hover:text-white"
        }`}
        aria-pressed={active}
      >
        <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
        {loading ? "Saving…" : active ? "Following" : "Follow"}
      </button>
      <GuestSignInDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        feature="following teams"
      />
    </>
  );
}
