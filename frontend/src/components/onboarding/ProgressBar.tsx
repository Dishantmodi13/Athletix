"use client";

import { motion } from "framer-motion";
import { TOTAL_STEPS } from "@/types/onboarding";

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-athletix-text-muted">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
        <span className="text-xs text-athletix-text-muted">{Math.round(progress)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-athletix-primary to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)",
          }}
        />
      </div>
    </div>
  );
}
