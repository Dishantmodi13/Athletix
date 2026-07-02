"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { TeamOption } from "@/data/onboardingData";

interface TeamCardProps {
  team: TeamOption;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

export function TeamCard({ team, selected, onToggle, index }: TeamCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`auth-glass-card relative flex flex-col items-center gap-3 rounded-2xl p-5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 ${
        selected
          ? "ring-2 ring-athletix-primary shadow-[0_0_24px_-6px_rgba(59,130,246,0.5)]"
          : "hover:ring-1 hover:ring-white/[0.12]"
      }`}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg"
        style={{ backgroundColor: team.color }}
      >
        {team.shortName}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{team.name}</p>
        <p className="text-xs text-athletix-text-muted">{team.emoji}</p>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-athletix-primary"
        >
          <Check className="h-3 w-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
