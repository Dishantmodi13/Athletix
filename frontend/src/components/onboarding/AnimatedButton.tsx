"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit";
  className?: string;
}

const variants = {
  primary: "auth-primary-btn text-white",
  ghost: "bg-transparent text-athletix-text-muted hover:text-white",
  outline:
    "border border-white/[0.12] bg-white/[0.03] text-athletix-text-secondary hover:border-athletix-primary/30 hover:bg-white/[0.06]",
};

export function AnimatedButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
  className = "",
}: AnimatedButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
