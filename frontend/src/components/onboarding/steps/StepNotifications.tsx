"use client";

import { motion } from "framer-motion";
import { NOTIFICATIONS } from "@/data/onboardingData";
import { PreferenceCard } from "../PreferenceCard";
import { StepNavigation } from "../StepNavigation";

interface StepNotificationsProps {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StepNotifications({
  selected,
  onToggle,
  onBack,
  onContinue,
  onSkip,
}: StepNotificationsProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Never miss the moments that matter.
        </h1>
        <p className="text-athletix-text-muted">
          Choose what you want to be notified about.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        {NOTIFICATIONS.map((option, index) => (
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
        onSkip={onSkip}
        showSkip
      />
    </>
  );
}
