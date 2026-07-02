import { AuthExperience } from "@/components/auth/AuthExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Athletix",
  description: "Reset your Athletix account password.",
};

export default function ForgotPasswordPage() {
  return <AuthExperience />;
}
