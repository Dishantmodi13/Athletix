"use client";

import { useRouter } from "next/navigation";
import type { StandingRow } from "@/lib/football";
import { teamRoute } from "@/lib/football";
import { TeamLogo } from "./ui/TeamLogo";

interface StandingsTableProps {
  rows: StandingRow[];
  limit?: number;
}

export function StandingsTable({ rows, limit }: StandingsTableProps) {
  const router = useRouter();
  const data = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="auth-glass-card overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wide text-athletix-text-muted">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-2 py-3 font-medium">Club</th>
            <th className="px-2 py-3 text-center font-medium">P</th>
            <th className="hidden px-2 py-3 text-center font-medium sm:table-cell">W</th>
            <th className="hidden px-2 py-3 text-center font-medium sm:table-cell">D</th>
            <th className="hidden px-2 py-3 text-center font-medium sm:table-cell">L</th>
            <th className="px-2 py-3 text-center font-medium">GD</th>
            <th className="px-4 py-3 text-center font-medium text-white">Pts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.team.id}
              onClick={() => router.push(teamRoute(row.team.id, row.team.name))}
              className="cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
                    row.rank <= 4
                      ? "bg-athletix-primary/20 text-athletix-primary"
                      : row.rank <= 6
                        ? "bg-athletix-secondary/15 text-athletix-secondary"
                        : "text-athletix-text-muted"
                  }`}
                >
                  {row.rank}
                </span>
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2.5">
                  <TeamLogo src={row.team.logo} alt={row.team.name} size={22} />
                  <span className="truncate font-medium text-white">{row.team.name}</span>
                </div>
              </td>
              <td className="px-2 py-3 text-center text-athletix-text-secondary">{row.all.played}</td>
              <td className="hidden px-2 py-3 text-center text-athletix-text-secondary sm:table-cell">{row.all.win}</td>
              <td className="hidden px-2 py-3 text-center text-athletix-text-secondary sm:table-cell">{row.all.draw}</td>
              <td className="hidden px-2 py-3 text-center text-athletix-text-secondary sm:table-cell">{row.all.lose}</td>
              <td className="px-2 py-3 text-center text-athletix-text-secondary">
                {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
              </td>
              <td className="px-4 py-3 text-center font-bold text-white">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
