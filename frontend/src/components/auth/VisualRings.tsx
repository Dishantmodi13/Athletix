"use client";

import { motion } from "framer-motion";

interface VisualRingsProps {
  mouseX: number;
  mouseY: number;
}

export function VisualRings({ mouseX, mouseY }: VisualRingsProps) {
  const parallaxX = mouseX * 15;
  const parallaxY = mouseY * 15;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ transform: `translate(${parallaxX * 0.3}px, ${parallaxY * 0.3}px)` }}
        className="relative flex items-center justify-center"
      >
        {[300, 380, 460].map((size, index) => (
          <motion.div
            key={size}
            className="absolute rounded-full border border-white/[0.04]"
            style={{ width: size, height: size }}
            animate={{ rotate: index % 2 === 0 ? 360 : -360 }}
            transition={{
              duration: 60 + index * 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
          className="absolute h-44 w-44 rounded-full bg-athletix-primary/20 blur-[80px]"
          style={{
            animation: "athletix-pulse-glow 4s ease-in-out infinite",
          }}
        />
      </motion.div>
    </div>
  );
}
