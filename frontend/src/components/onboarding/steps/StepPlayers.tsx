"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { getPlayersForTeams } from "@/data/onboardingData";
import { PlayerCard } from "../PlayerCard";
import { SearchBar } from "../SearchBar";
import { StepNavigation } from "../StepNavigation";

interface StepPlayersProps {
  teams: string[];
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StepPlayers({
  teams,
  selected,
  onToggle,
  onBack,
  onContinue,
  onSkip,
}: StepPlayersProps) {
  const [search, setSearch] = useState("");

  const players = useMemo(() => getPlayersForTeams(teams), [teams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q)
    );
  }, [players, search]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose your players
        </h1>
        <p className="text-athletix-text-muted">
          Follow the stars from your selected teams.
        </p>
      </motion.div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search players..."
        />
      </div>

      <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={selected.includes(player.id)}
            onToggle={() => onToggle(player.id)}
            index={index}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-athletix-text-muted">
          Select teams in the previous step to see players.
        </p>
      )}

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        showSkip
      />
    </>
  );
}
