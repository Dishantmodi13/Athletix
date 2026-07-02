"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ONBOARDING_STATE,
  STORAGE_KEY,
  type OnboardingPersistedState,
  TOTAL_STEPS,
} from "@/types/onboarding";

function loadState(): OnboardingPersistedState {
  if (typeof window === "undefined") return DEFAULT_ONBOARDING_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ONBOARDING_STATE;
    return { ...DEFAULT_ONBOARDING_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

function saveState(state: OnboardingPersistedState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingPersistedState>(DEFAULT_ONBOARDING_STATE);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadState();
    setState(saved);
    setShowWelcome(saved.completed);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: OnboardingPersistedState) => {
    setState(next);
    saveState(next);
  }, []);

  const update = useCallback(
    (patch: Partial<OnboardingPersistedState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        saveState(next);
        return next;
      });
    },
    []
  );

  const toggleItem = useCallback(
    (key: keyof Pick<OnboardingPersistedState, "sports" | "competitions" | "teams" | "players" | "notifications" | "contentPreferences">, id: string) => {
      setState((prev) => {
        const list = prev[key] as string[];
        const next = list.includes(id)
          ? list.filter((i) => i !== id)
          : [...list, id];
        const updated = { ...prev, [key]: next };
        saveState(updated);
        return updated;
      });
    },
    []
  );

  const goNext = useCallback(() => {
    setState((prev) => {
      const nextStep = Math.min(prev.currentStep + 1, TOTAL_STEPS);
      const updated = { ...prev, currentStep: nextStep };
      saveState(updated);
      return updated;
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const nextStep = Math.max(prev.currentStep - 1, 1);
      const updated = { ...prev, currentStep: nextStep };
      saveState(updated);
      return updated;
    });
  }, []);

  const goToStep = useCallback((step: number) => {
    update({ currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)) });
  }, [update]);

  const completeOnboarding = useCallback(() => {
    setState((prev) => {
      const updated = { ...prev, completed: true };
      saveState(updated);
      return updated;
    });
    setShowWelcome(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    persist(DEFAULT_ONBOARDING_STATE);
    setShowWelcome(false);
  }, [persist]);

  return {
    state,
    hydrated,
    showWelcome,
    setShowWelcome,
    update,
    toggleItem,
    goNext,
    goBack,
    goToStep,
    completeOnboarding,
    resetOnboarding,
  };
}
