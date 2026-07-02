"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface SecondaryButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: SecondaryButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={`auth-secondary-btn flex min-h-[52px] w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-athletix-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
