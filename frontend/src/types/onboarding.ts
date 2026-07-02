export type Sport = "football" | "cricket";

export interface OnboardingData {
  sports: Sport[];
  competitions: string[];
  teams: string[];
  players: string[];
  notifications: string[];
  contentPreferences: string[];
}

export interface OnboardingPersistedState extends OnboardingData {
  currentStep: number;
  completed: boolean;
}

export const TOTAL_STEPS = 7;

export const DEFAULT_ONBOARDING_STATE: OnboardingPersistedState = {
  sports: [],
  competitions: [],
  teams: [],
  players: [],
  notifications: [],
  contentPreferences: [],
  currentStep: 1,
  completed: false,
};

export const STORAGE_KEY = "athletix-onboarding";
