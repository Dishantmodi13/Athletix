import { AuthExperience } from "@/components/auth/AuthExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Athletix",
  description: "Join Athletix — the next-generation sports intelligence platform.",
};

export default function SignUpPage() {
  return <AuthExperience />;
}
