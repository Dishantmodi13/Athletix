"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { CompetitionOption } from "@/data/onboardingData";

interface CompetitionCardProps {
  competition: CompetitionOption;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

export function CompetitionCard({
  competition,
  selected,
  onToggle,
  index,
}: CompetitionCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`auth-glass-card group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 ${
        selected
          ? "ring-2 ring-athletix-primary shadow-[0_0_24px_-6px_rgba(59,130,246,0.5)]"
          : "hover:ring-1 hover:ring-white/[0.12]"
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${competition.gradient} opacity-40`} />
      <div className="relative">
        <p className="mb-1 text-xs uppercase tracking-wider text-athletix-text-muted">
          {competition.region}
        </p>
        <h4 className="font-semibold text-white">{competition.name}</h4>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-athletix-primary"
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
