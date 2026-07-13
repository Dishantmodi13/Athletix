"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { FormEvent } from "react";
import { AuthHeading } from "./ErrorMessage";
import { CountdownTimer } from "./CountdownTimer";
import { OTPInput } from "./OTPInput";
import { PrimaryButton } from "./PrimaryButton";

interface OTPFormProps {
  email: string;
  otp: string;
  onOtpChange: (value: string) => void;
  loading: boolean;
  resendCooldown: number;
  hasError: boolean;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
  variant?: "auth" | "profile";
}

export function OTPForm({
  email,
  otp,
  onOtpChange,
  loading,
  resendCooldown,
  hasError,
  onSubmit,
  onResend,
  onBack,
  variant = "auth",
}: OTPFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => {
    return a + "*".repeat(Math.min(b.length, 4)) + c;
  });

  return (
    <motion.form
      key="otp-step"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-athletix-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/40 rounded-lg px-1"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Change email
      </button>

      <AuthHeading
        title="Verify Your Email"
        subtitle={`We've sent a 6-digit verification code to ${maskedEmail}. Check your inbox and spam folder.`}
      />

      <OTPInput
        value={otp}
        onChange={onOtpChange}
        disabled={loading}
        error={hasError}
        autoFocus
      />

      <div className="space-y-3">
        <CountdownTimer seconds={resendCooldown} />

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0 || loading}
            className="text-sm font-medium text-athletix-primary transition-colors hover:text-blue-400 disabled:cursor-not-allowed disabled:text-athletix-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/40 rounded-lg px-2 py-1"
          >
            Resend Code
          </button>
        </div>
      </div>

      <PrimaryButton
        type="submit"
        loading={loading}
        loadingText="Verifying..."
        disabled={otp.length !== 6}
      >
        Verify {variant === "profile" ? "& Sign In" : "& Continue"}
      </PrimaryButton>
    </motion.form>
  );
}
