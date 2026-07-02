"use client";

import { motion } from "framer-motion";
import { StandingsTable } from "./StandingsTable";

export interface StandingRow {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  form: string;
}

export interface StandingGroup {
  name: string;
  rows: StandingRow[];
}

interface StandingsGroupsProps {
  groups: StandingGroup[];
  limit?: number;
  columns?: 1 | 2 | 3;
}

export function StandingsGroups({ groups, limit, columns = 2 }: StandingsGroupsProps) {
  if (groups.length === 0) return null;

  const gridCols =
    columns === 3
      ? "lg:grid-cols-3"
      : columns === 1
        ? "grid-cols-1"
        : "md:grid-cols-2";

  return (
    <div className={`grid gap-6 ${gridCols}`}>
      {groups.map((group, i) => (
        <motion.div
          key={group.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          {groups.length > 1 && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-athletix-text-muted">
              {group.name}
            </h3>
          )}
          <StandingsTable rows={group.rows} limit={limit} />
        </motion.div>
      ))}
    </div>
  );
}
