"use client";

import { useRouter } from "next/navigation";
import { enableGuestMode } from "@/lib/auth";
import { SecondaryButton } from "./SecondaryButton";

export function GuestButton() {
  const router = useRouter();

  const handleGuest = () => {
    enableGuestMode();
    router.push("/dashboard");
  };

  return (
    <SecondaryButton onClick={handleGuest} aria-label="Explore Athletix as a guest">
      Explore as Guest
    </SecondaryButton>
  );
}
