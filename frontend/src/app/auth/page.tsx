import { AuthExperience } from "@/components/auth/AuthExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Athletix",
  description: "Sign in to Athletix with a one-time code sent to your email.",
};

export default function AuthPage() {
  return <AuthExperience />;
}
