"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface StepContainerProps {
  stepKey: number | string;
  children: ReactNode;
}

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export function StepContainer({ stepKey, children }: StepContainerProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
