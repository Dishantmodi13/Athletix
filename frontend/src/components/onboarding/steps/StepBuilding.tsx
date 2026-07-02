"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BUILDING_MESSAGES } from "@/data/onboardingData";
import { FloatingParticles } from "@/components/auth/FloatingParticles";

const FootballScene = dynamic(
  () =>
    import("@/components/auth/FootballScene").then((mod) => mod.FootballScene),
  { ssr: false }
);

interface StepBuildingProps {
  onComplete: () => void;
}

export function StepBuilding({ onComplete }: StepBuildingProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + 2;
      });
    }, 80);

    const messageInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % BUILDING_MESSAGES.length);
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <FloatingParticles count={30} className="opacity-50" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="relative mb-10 h-48 w-48 sm:h-56 sm:w-56"
      >
        <div className="absolute bottom-0 left-1/2 h-16 w-32 -translate-x-1/2 rounded-full bg-athletix-primary/30 blur-[50px]" />
        <FootballScene mouse={{ x: 0, y: 0 }} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-3 text-2xl font-bold text-white sm:text-3xl"
      >
        Building your personalized dashboard...
      </motion.h2>

      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="mb-8 text-sm text-athletix-text-muted"
      >
        {BUILDING_MESSAGES[messageIndex]}
      </motion.p>

      <div className="w-full max-w-md">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-athletix-primary to-blue-400"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="mt-2 text-xs text-athletix-text-muted">{progress}%</p>
      </div>
    </div>
  );
}
