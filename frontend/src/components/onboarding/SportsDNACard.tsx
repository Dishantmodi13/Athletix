"use client";

import { motion } from "framer-motion";
import type { OnboardingPersistedState } from "@/types/onboarding";
import {
  CONTENT_PREFERENCES,
  getCompetitionById,
  getPlayerById,
  getSportById,
  getTeamById,
  NOTIFICATIONS,
} from "@/data/onboardingData";

interface SportsDNACardProps {
  state: OnboardingPersistedState;
}

function DNASection({
  title,
  items,
  delay,
}: {
  title: string;
  items: string[];
  delay: number;
}) {
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-athletix-text-muted">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-sm text-athletix-text-secondary"
          >
            {item}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function SportsDNACard({ state }: SportsDNACardProps) {
  const sports = state.sports
    .map((id) => {
      const sport = getSportById(id);
      return sport ? `${sport.emoji} ${sport.name}` : null;
    })
    .filter(Boolean) as string[];

  const competitions = state.competitions
    .map((id) => getCompetitionById(id)?.name)
    .filter(Boolean) as string[];

  const teams = state.teams
    .map((id) => getTeamById(id)?.name)
    .filter(Boolean) as string[];

  const players = state.players
    .map((id) => getPlayerById(id)?.name)
    .filter(Boolean) as string[];

  const content = state.contentPreferences
    .map((id) => CONTENT_PREFERENCES.find((c) => c.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="auth-glass-card w-full max-w-lg rounded-3xl p-6 sm:p-8"
    >
      <h3 className="mb-6 text-center text-lg font-bold text-white">
        Your Sports DNA
      </h3>
      <div className="space-y-5">
        <DNASection title="Sports" items={sports} delay={0.4} />
        <DNASection title="Favorite Competitions" items={competitions} delay={0.5} />
        <DNASection title="Favorite Teams" items={teams} delay={0.6} />
        <DNASection title="Favorite Players" items={players} delay={0.7} />
        <DNASection title="Content Focus" items={content} delay={0.8} />
      </div>
    </motion.div>
  );
}
