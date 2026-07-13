"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AthletixLogo } from "./AthletixLogo";
import { AuthHeading } from "./ErrorMessage";
import { PrimaryButton } from "./PrimaryButton";

export function AuthCard() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="auth-glass-card w-full max-w-[440px] overflow-hidden rounded-[28px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6">
        <AthletixLogo size="md" />

        <AuthHeading
          title={
            <>
              Welcome to{" "}
              <span className="bg-gradient-to-r from-athletix-primary to-blue-400 bg-clip-text text-transparent">
                Athletix
              </span>
            </>
          }
          subtitle="Live scores, standings, and match insights from the world's biggest competitions."
        />

        <PrimaryButton type="button" onClick={() => router.push("/dashboard")}>
          Get Started
        </PrimaryButton>
      </div>
    </motion.div>
  );
}
