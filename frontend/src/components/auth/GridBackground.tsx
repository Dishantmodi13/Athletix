"use client";

import { motion } from "framer-motion";

export function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "athletix-grid-drift 20s linear infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
