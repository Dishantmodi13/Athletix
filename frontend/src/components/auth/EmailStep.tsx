"use client";

import { motion } from "framer-motion";
import { FormEvent } from "react";
import { AthletixLogo } from "./AthletixLogo";
import { AuthHeading } from "./ErrorMessage";
import { EmailInput } from "./EmailInput";
import { PrimaryButton } from "./PrimaryButton";

interface EmailStepProps {
  email: string;
  onEmailChange: (value: string) => void;
  emailError: string | null;
  loading: boolean;
  onSubmit: () => void;
}

export function EmailStep({
  email,
  onEmailChange,
  emailError,
  loading,
  onSubmit,
}: EmailStepProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <motion.form
      key="email-step"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      <AthletixLogo size="md" />

      <AuthHeading
        title={
          <>
            Welcome to{" "}
            <span className="bg-gradient-to-r from-athletix-primary to-blue-400 bg-clip-text text-transparent">
              Athletix
            </span>
          </>
        }
        subtitle="Continue with your email to personalize your sports experience."
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EmailInput
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          error={emailError ?? undefined}
          disabled={loading}
          required
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <PrimaryButton
          type="submit"
          loading={loading}
          loadingText="Sending code..."
          disabled={!email.trim()}
        >
          Send Verification Code
        </PrimaryButton>
      </motion.div>
    </motion.form>
  );
}
