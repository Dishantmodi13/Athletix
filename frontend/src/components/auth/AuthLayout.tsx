"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { FloatingParticles } from "./FloatingParticles";
import { VisualExperience } from "./VisualExperience";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative grid h-dvh w-full grid-cols-1 overflow-hidden bg-athletix-bg-deep lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="auth-noise pointer-events-none absolute inset-0 z-0"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 75% 15%, rgba(59, 130, 246, 0.09) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 85%, rgba(163, 255, 18, 0.04) 0%, transparent 40%),
            linear-gradient(180deg, #050505 0%, #09090b 50%, #111111 100%)
          `,
        }}
      />

      <FloatingParticles count={14} className="z-0 opacity-25" />

      <aside className="relative z-0 hidden h-full min-h-0 overflow-hidden lg:block">
        <VisualExperience variant="panel" />
      </aside>

      <main className="relative z-10 flex min-h-0 items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <VisualExperience variant="background" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.94) 70%)",
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[440px] py-2">{children}</div>
      </main>
    </div>
  );
}
