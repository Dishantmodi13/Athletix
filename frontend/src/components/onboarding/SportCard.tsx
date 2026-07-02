"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRef } from "react";
import type { SportOption } from "@/data/onboardingData";

interface SportCardProps {
  sport: SportOption;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

export function SportCard({ sport, selected, onToggle, index }: SportCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(${selected ? 1.03 : 1.02})`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = selected ? "scale(1.03)" : "scale(1)";
  };

  return (
    <motion.button
      ref={cardRef}
      type="button"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
      onClick={onToggle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative h-64 w-full overflow-hidden rounded-3xl text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50 sm:h-72 ${
        selected
          ? "ring-2 ring-athletix-primary shadow-[0_0_40px_-8px_rgba(59,130,246,0.6)]"
          : "ring-1 ring-white/[0.08] hover:ring-white/[0.15]"
      }`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${sport.gradient}`} />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, ${sport.accent}40 0%, transparent 50%)`,
        }}
      />
      <div className="auth-noise absolute inset-0 opacity-40" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
        <span className="mb-3 text-4xl sm:text-5xl">{sport.emoji}</span>
        <h3 className="mb-2 text-2xl font-bold text-white">{sport.name}</h3>
        <p className="text-sm leading-relaxed text-athletix-text-muted">
          {sport.description}
        </p>
      </div>

      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-athletix-primary shadow-[0_0_16px_rgba(59,130,246,0.6)]"
        >
          <Check className="h-4 w-4 text-white" />
        </motion.div>
      )}

      {selected && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: "inset 0 0 30px rgba(59, 130, 246, 0.2)" }}
        />
      )}
    </motion.button>
  );
}
