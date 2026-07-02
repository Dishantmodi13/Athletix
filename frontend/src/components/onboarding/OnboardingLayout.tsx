"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { AthletixLogo } from "@/components/auth/AthletixLogo";
import { FloatingParticles } from "@/components/auth/FloatingParticles";
import { ProgressBar } from "./ProgressBar";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  showProgress?: boolean;
}

export function OnboardingLayout({
  children,
  currentStep,
  showProgress = true,
}: OnboardingLayoutProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-athletix-bg-deep">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="auth-noise pointer-events-none absolute inset-0"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 70% 10%, rgba(59, 130, 246, 0.1) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 90%, rgba(163, 255, 18, 0.05) 0%, transparent 40%),
            linear-gradient(180deg, #050505 0%, #09090b 50%, #111111 100%)
          `,
        }}
      />
      <FloatingParticles count={25} className="opacity-30" />

      <motion.div
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-athletix-primary/10 blur-[120px]"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <header className="relative z-10 px-6 py-6 sm:px-10">
        <AthletixLogo size="sm" />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-8 sm:px-8">
        {showProgress && (
          <div className="mb-8">
            <ProgressBar currentStep={currentStep} />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
