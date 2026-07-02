"use client";

import { motion } from "framer-motion";
import { CONTENT_PREFERENCES } from "@/data/onboardingData";
import { PreferenceCard } from "../PreferenceCard";
import { StepNavigation } from "../StepNavigation";

interface StepContentProps {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StepContent({
  selected,
  onToggle,
  onBack,
  onContinue,
}: StepContentProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          What do you enjoy the most?
        </h1>
        <p className="text-athletix-text-muted">
          Personalize your homepage with the content you love.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_PREFERENCES.map((option, index) => (
          <PreferenceCard
            key={option.id}
            option={option}
            selected={selected.includes(option.id)}
            onToggle={() => onToggle(option.id)}
            index={index}
          />
        ))}
      </div>

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={selected.length === 0}
      />
    </>
  );
}
