import { AuthExperience } from "@/components/auth/AuthExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Athletix",
  description:
    "Live scores, standings, and match insights from the world's biggest competitions.",
};

export default function Home() {
  return <AuthExperience />;
}
