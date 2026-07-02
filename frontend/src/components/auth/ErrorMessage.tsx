"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ErrorMessageProps {
  message: string;
  shakeKey?: number;
}

export function ErrorMessage({ message, shakeKey = 0 }: ErrorMessageProps) {
  return (
    <motion.div
      key={shakeKey}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="alert"
      aria-live="polite"
    >
      <motion.div
        animate={{ x: [0, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300"
      >
        {message}
      </motion.div>
    </motion.div>
  );
}

interface AuthHeadingProps {
  title: ReactNode;
  subtitle: string;
}

export function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-athletix-text-muted">{subtitle}</p>
    </div>
  );
}
