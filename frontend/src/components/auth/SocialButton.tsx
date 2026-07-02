"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface SocialButtonProps {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  delay?: number;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SocialButton({
  children,
  icon,
  onClick,
  delay = 0,
  loading = false,
  disabled = false,
  ariaLabel,
}: SocialButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={isDisabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel ?? (typeof children === "string" ? children : undefined)}
      aria-busy={loading}
      className="auth-social-btn group flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-2xl px-3 py-3 text-xs font-medium text-athletix-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[52px] sm:gap-3 sm:px-4 sm:py-3.5 sm:text-sm"
    >
      <span className="flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110 group-disabled:scale-100">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-athletix-primary" />
        ) : (
          icon
        )}
      </span>
      <span className="truncate">{loading ? "Connecting..." : children}</span>
    </motion.button>
  );
}
