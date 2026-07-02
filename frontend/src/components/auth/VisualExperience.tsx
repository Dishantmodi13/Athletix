"use client";

import dynamic from "next/dynamic";
import { motion, useSpring } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FloatingParticles } from "./FloatingParticles";
import { GridBackground } from "./GridBackground";
import { VisualRings } from "./VisualRings";

const FootballScene = dynamic(
  () => import("./FootballScene").then((mod) => mod.FootballScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-white/5 lg:h-32 lg:w-32" />
      </div>
    ),
  }
);

type VisualVariant = "panel" | "background";

interface VisualExperienceProps {
  variant?: VisualVariant;
  className?: string;
}

const STAGE_SIZES: Record<VisualVariant, string> = {
  panel: "h-[min(460px,72vh)] w-[min(460px,72vh)]",
  background: "h-[min(280px,55vw)] w-[min(280px,55vw)]",
};

export function VisualExperience({
  variant = "panel",
  className = "",
}: VisualExperienceProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const isBackground = variant === "background";

  const springX = useSpring(0, { stiffness: 80, damping: 20 });
  const springY = useSpring(0, { stiffness: 80, damping: 20 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isBackground) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMouse({ x: x * 2, y: y * 2 });
      springX.set(x * 16);
      springY.set(y * 16);
    },
    [isBackground, springX, springY]
  );

  useEffect(() => {
    springX.set(0);
    springY.set(0);
    setMouse({ x: 0, y: 0 });
  }, [variant, springX, springY]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      aria-hidden="true"
    >
      <GridBackground />
      <FloatingParticles count={isBackground ? 12 : 24} />

      <div
        className="absolute inset-0"
        style={{
          background: isBackground
            ? "radial-gradient(ellipse at 50% 35%, rgba(59, 130, 246, 0.1) 0%, transparent 55%)"
            : "radial-gradient(ellipse at 50% 55%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
        }}
      />

      {!isBackground && <VisualRings mouseX={mouse.x} mouseY={mouse.y} />}

      {/* Football stage — fixed anchor */}
      <div
        className={`absolute left-1/2 z-10 -translate-x-1/2 ${
          isBackground ? "top-[12%]" : "top-1/2 -translate-y-1/2"
        }`}
      >
        <motion.div style={{ x: springX, y: springY }} className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className={`relative ${STAGE_SIZES[variant]}`}
          >
            <div
              className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-athletix-primary/30 blur-[60px] ${
                isBackground ? "bottom-[10%] h-16 w-32" : "bottom-[14%] h-24 w-48 blur-[72px]"
              }`}
              style={{ animation: "athletix-pulse-glow 3s ease-in-out infinite" }}
            />

            <div className="relative h-full w-full">
              <FootballScene mouse={mouse} />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {!isBackground && (
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-athletix-bg-deep to-transparent" />
      )}
    </div>
  );
}
