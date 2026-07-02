"use client";

import { motion } from "framer-motion";
import { SPORTS } from "@/data/onboardingData";
import type { Sport } from "@/types/onboarding";
import { SportCard } from "../SportCard";
import { StepNavigation } from "../StepNavigation";

interface StepSportsProps {
  selected: Sport[];
  onToggle: (id: Sport) => void;
  onContinue: () => void;
}

export function StepSports({ selected, onToggle, onContinue }: StepSportsProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose your sports
        </h1>
        <p className="text-athletix-text-muted">
          Personalize your Athletix experience from day one.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2">
        {SPORTS.map((sport, index) => (
          <SportCard
            key={sport.id}
            sport={sport}
            selected={selected.includes(sport.id)}
            onToggle={() => onToggle(sport.id)}
            index={index}
          />
        ))}
      </div>

      <StepNavigation
        showBack={false}
        onContinue={onContinue}
        continueDisabled={selected.length === 0}
      />
    </>
  );
}
