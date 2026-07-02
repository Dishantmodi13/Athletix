"use client";

import { useCallback } from "react";
import { z } from "zod";
import type { Sport } from "@/types/onboarding";
import {
  getCompetitionsForSports,
  getPlayersForTeams,
  getTeamsForCompetitions,
} from "@/data/onboardingData";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingLayout } from "./OnboardingLayout";
import { StepContainer } from "./StepContainer";
import { StepSports } from "./steps/StepSports";
import { StepCompetitions } from "./steps/StepCompetitions";
import { StepTeams } from "./steps/StepTeams";
import { StepPlayers } from "./steps/StepPlayers";
import { StepNotifications } from "./steps/StepNotifications";
import { StepContent } from "./steps/StepContent";
import { StepBuilding } from "./steps/StepBuilding";
import { StepWelcome } from "./steps/StepWelcome";

export const sportsStepSchema = z.object({
  sports: z.array(z.enum(["football", "cricket"])).min(1),
});

export function OnboardingExperience() {
  const {
    state,
    hydrated,
    showWelcome,
    toggleItem,
    update,
    goNext,
    goBack,
    completeOnboarding,
  } = useOnboarding();

  const toggleSport = useCallback(
    (sport: Sport) => {
      const isSelected = state.sports.includes(sport);
      const newSports = isSelected
        ? state.sports.filter((s) => s !== sport)
        : [...state.sports, sport];

      const validCompetitions = getCompetitionsForSports(newSports).map(
        (c) => c.id
      );
      const validCompetitionIds = state.competitions.filter((id) =>
        validCompetitions.includes(id)
      );
      const validTeams = getTeamsForCompetitions(validCompetitionIds).map(
        (t) => t.id
      );
      const validTeamIds = state.teams.filter((id) =>
        validTeams.includes(id)
      );
      const validPlayers = getPlayersForTeams(validTeamIds).map((p) => p.id);
      const validPlayerIds = state.players.filter((id) =>
        validPlayers.includes(id)
      );

      update({
        sports: newSports,
        competitions: validCompetitionIds,
        teams: validTeamIds,
        players: validPlayerIds,
      });
    },
    [state, update]
  );

  const handleSportsContinue = () => {
    const result = sportsStepSchema.safeParse({ sports: state.sports });
    if (result.success) goNext();
  };

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-athletix-bg-deep">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-athletix-primary/30 border-t-athletix-primary" />
      </div>
    );
  }

  if (showWelcome) {
    return (
      <OnboardingLayout currentStep={7} showProgress={false}>
        <StepWelcome state={state} />
      </OnboardingLayout>
    );
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <StepSports
            selected={state.sports}
            onToggle={toggleSport}
            onContinue={handleSportsContinue}
          />
        );
      case 2:
        return (
          <StepCompetitions
            sports={state.sports}
            selected={state.competitions}
            onToggle={(id) => toggleItem("competitions", id)}
            onBack={goBack}
            onContinue={goNext}
            onSkip={goNext}
          />
        );
      case 3:
        return (
          <StepTeams
            competitions={state.competitions}
            selected={state.teams}
            onToggle={(id) => toggleItem("teams", id)}
            onBack={goBack}
            onContinue={goNext}
            onSkip={goNext}
          />
        );
      case 4:
        return (
          <StepPlayers
            teams={state.teams}
            selected={state.players}
            onToggle={(id) => toggleItem("players", id)}
            onBack={goBack}
            onContinue={goNext}
            onSkip={goNext}
          />
        );
      case 5:
        return (
          <StepNotifications
            selected={state.notifications}
            onToggle={(id) => toggleItem("notifications", id)}
            onBack={goBack}
            onContinue={goNext}
            onSkip={goNext}
          />
        );
      case 6:
        return (
          <StepContent
            selected={state.contentPreferences}
            onToggle={(id) => toggleItem("contentPreferences", id)}
            onBack={goBack}
            onContinue={goNext}
          />
        );
      case 7:
        return <StepBuilding onComplete={completeOnboarding} />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      currentStep={state.currentStep}
      showProgress={state.currentStep < 7}
    >
      <StepContainer stepKey={state.currentStep}>{renderStep()}</StepContainer>
    </OnboardingLayout>
  );
}
