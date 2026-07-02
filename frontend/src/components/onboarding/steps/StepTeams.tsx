"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { getTeamsForCompetitions } from "@/data/onboardingData";
import { TeamCard } from "../TeamCard";
import { SearchBar } from "../SearchBar";
import { StepNavigation } from "../StepNavigation";

interface StepTeamsProps {
  competitions: string[];
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StepTeams({
  competitions,
  selected,
  onToggle,
  onBack,
  onContinue,
  onSkip,
}: StepTeamsProps) {
  const [search, setSearch] = useState("");

  const teams = useMemo(
    () => getTeamsForCompetitions(competitions),
    [competitions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q)
    );
  }, [teams, search]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose your teams
        </h1>
        <p className="text-athletix-text-muted">
          Pick the clubs and national teams you support.
        </p>
      </motion.div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search teams..."
        />
      </div>

      <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((team, index) => (
          <TeamCard
            key={team.id}
            team={team}
            selected={selected.includes(team.id)}
            onToggle={() => onToggle(team.id)}
            index={index}
          />
        ))}
      </div>

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        showSkip
        continueDisabled={selected.length === 0}
      />
    </>
  );
}
