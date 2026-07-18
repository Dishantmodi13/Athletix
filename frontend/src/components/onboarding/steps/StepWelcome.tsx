"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OnboardingPersistedState } from "@/types/onboarding";
import { markSessionStarted } from "@/lib/session";
import { AnimatedButton } from "../AnimatedButton";
import { SportsDNACard } from "../SportsDNACard";

interface StepWelcomeProps {
  state: OnboardingPersistedState;
}

export function StepWelcome({ state }: StepWelcomeProps) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="mb-6"
      >
        <div className="relative">
          <CheckCircle2 className="h-16 w-16 text-athletix-primary sm:h-20 sm:w-20" />
          <motion.div
            className="absolute inset-0 rounded-full bg-athletix-primary/20 blur-2xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8 text-3xl font-bold tracking-tight text-white sm:text-5xl"
      >
        Welcome to{" "}
        <span className="bg-gradient-to-r from-athletix-primary to-blue-400 bg-clip-text text-transparent">
          Athletix
        </span>
      </motion.h1>

      <SportsDNACard state={state} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-10"
      >
        <AnimatedButton
          className="min-w-[200px] px-10"
          onClick={() => {
            markSessionStarted();
            router.push("/dashboard");
          }}
        >
          Enter Athletix
        </AnimatedButton>
      </motion.div>
    </div>
  );
}
