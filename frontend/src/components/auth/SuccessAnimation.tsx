"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function SuccessAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-4 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
      >
        <CheckCircle2 className="h-16 w-16 text-athletix-primary" />
      </motion.div>
      <p className="text-lg font-semibold text-white">You&apos;re in!</p>
      <p className="text-sm text-athletix-text-muted">Redirecting to your experience...</p>
    </motion.div>
  );
}
