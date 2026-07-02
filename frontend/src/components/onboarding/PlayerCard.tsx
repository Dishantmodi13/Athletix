"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PlayerOption } from "@/data/onboardingData";
import { getTeamById } from "@/data/onboardingData";

interface PlayerCardProps {
  player: PlayerOption;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerCard({ player, selected, onToggle, index }: PlayerCardProps) {
  const team = getTeamById(player.teamId);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`auth-glass-card relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 ${
        selected
          ? "ring-2 ring-athletix-primary shadow-[0_0_24px_-6px_rgba(59,130,246,0.5)]"
          : "hover:ring-1 hover:ring-white/[0.12]"
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${player.gradient} text-sm font-bold text-white shadow-lg ring-2 ring-white/10`}
      >
        {getInitials(player.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{player.name}</p>
        <p className="truncate text-xs text-athletix-text-muted">
          {team?.name ?? "Unknown"} · {player.position}
        </p>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-athletix-primary"
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
