"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { COMPETITIONS } from "@/lib/football";

const COMPETITION_ACCENTS: Record<number, string> = {
  39: "from-purple-600/30 to-indigo-700/10",
  140: "from-orange-600/30 to-red-700/10",
  135: "from-blue-600/30 to-cyan-700/10",
  78: "from-red-600/30 to-rose-700/10",
  61: "from-sky-600/30 to-blue-700/10",
  2: "from-indigo-600/30 to-violet-700/10",
  3: "from-amber-600/30 to-orange-700/10",
  1: "from-emerald-600/30 to-teal-700/10",
};

export default function CompetitionsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Competitions" icon={<Trophy className="h-5 w-5" />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMPETITIONS.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={`/dashboard/competitions/${c.id}`}
              className="auth-glass-card group relative block overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-athletix-primary/30 hover:shadow-[0_0_30px_-12px_rgba(59,130,246,0.4)]"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${COMPETITION_ACCENTS[c.id] ?? "from-white/10 to-white/5"} opacity-60`}
              />
              <div className="relative">
                <Trophy className="mb-4 h-8 w-8 text-white/80" />
                <h3 className="text-lg font-bold text-white">{c.name}</h3>
                <p className="text-sm text-athletix-text-muted">{c.country}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
