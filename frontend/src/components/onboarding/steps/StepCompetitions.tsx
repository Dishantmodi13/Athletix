"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { getCompetitionsForSports } from "@/data/onboardingData";
import type { Sport } from "@/types/onboarding";
import { CompetitionCard } from "../CompetitionCard";
import { SearchBar } from "../SearchBar";
import { StepNavigation } from "../StepNavigation";

interface StepCompetitionsProps {
  sports: Sport[];
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StepCompetitions({
  sports,
  selected,
  onToggle,
  onBack,
  onContinue,
  onSkip,
}: StepCompetitionsProps) {
  const [search, setSearch] = useState("");

  const competitions = useMemo(
    () => getCompetitionsForSports(sports),
    [sports]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return competitions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [competitions, search]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose your competitions
        </h1>
        <p className="text-athletix-text-muted">
          Select the leagues and tournaments you follow most.
        </p>
      </motion.div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search competitions..."
        />
      </div>

      <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((competition, index) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            selected={selected.includes(competition.id)}
            onToggle={() => onToggle(competition.id)}
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
