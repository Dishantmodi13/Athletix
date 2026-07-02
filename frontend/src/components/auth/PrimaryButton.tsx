"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface PrimaryButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export function PrimaryButton({
  children,
  loading = false,
  loadingText = "Please wait...",
  disabled,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { y: -2, scale: 1.01 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      disabled={isDisabled}
      className={`auth-primary-btn flex min-h-[52px] w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-athletix-bg-deep ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
