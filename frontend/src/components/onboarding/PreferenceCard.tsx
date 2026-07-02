"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PreferenceOption } from "@/data/onboardingData";

interface PreferenceCardProps {
  option: PreferenceOption;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

export function PreferenceCard({
  option,
  selected,
  onToggle,
  index,
}: PreferenceCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`auth-glass-card relative rounded-2xl p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 ${
        selected
          ? "ring-2 ring-athletix-primary shadow-[0_0_24px_-6px_rgba(59,130,246,0.5)]"
          : "hover:ring-1 hover:ring-white/[0.12]"
      }`}
    >
      <span className="mb-3 block text-2xl">{option.icon}</span>
      <h4 className="mb-1 font-semibold text-white">{option.label}</h4>
      <p className="text-xs leading-relaxed text-athletix-text-muted">
        {option.description}
      </p>
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
