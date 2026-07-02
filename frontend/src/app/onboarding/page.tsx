import { OnboardingExperience } from "@/components/onboarding/OnboardingExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personalize Your Experience | Athletix",
  description:
    "Set up your personalized Athletix sports intelligence dashboard.",
};

export default function OnboardingPage() {
  return <OnboardingExperience />;
}
