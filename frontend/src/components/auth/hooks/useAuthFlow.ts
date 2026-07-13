"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { disableGuestMode } from "@/lib/auth";
import { saveAuthToken, sendOtp, verifyOtp } from "@/lib/api";
import { saveUserProfile } from "@/lib/user";
import { validateEmail } from "../EmailInput";

export type AuthStep = "email" | "otp";

interface UseAuthFlowOptions {
  /** Called after OTP verification succeeds instead of redirecting. */
  onVerified?: () => void | Promise<void>;
  /** Where to send the user after success. Set to false to stay on the page. */
  redirectTo?: string | false;
}

export function useAuthFlow(options: UseAuthFlowOptions = {}) {
  const router = useRouter();
  const { onVerified, redirectTo = "/dashboard" } = options;
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const triggerError = useCallback((message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  }, []);

  const sendVerificationCode = useCallback(async () => {
    setEmailError(null);
    setError(null);

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      setShakeKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStep("otp");
      setOtp("");
      setResendCooldown(60);
    } catch (err) {
      triggerError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }, [email, triggerError]);

  const verifyAndContinue = useCallback(async () => {
    if (otp.length !== 6) {
      triggerError("Please enter the complete 6-digit code");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await verifyOtp(email.trim(), otp);
      disableGuestMode();
      saveAuthToken(data.token);
      saveUserProfile(data.user);

      if (onVerified) {
        await onVerified();
        return;
      }

      setSuccess(true);
      if (redirectTo !== false) {
        setTimeout(() => router.push(redirectTo), 900);
      }
    } catch (err) {
      triggerError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [email, otp, onVerified, redirectTo, router, triggerError]);

  const resendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);

    try {
      await sendOtp(email.trim());
      setOtp("");
      setResendCooldown(60);
    } catch (err) {
      triggerError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }, [email, resendCooldown, triggerError]);

  const goBackToEmail = useCallback(() => {
    setStep("email");
    setOtp("");
    setError(null);
    setEmailError(null);
  }, []);

  return {
    step,
    email,
    setEmail,
    otp,
    setOtp,
    loading,
    error,
    emailError,
    shakeKey,
    resendCooldown,
    success,
    sendVerificationCode,
    verifyAndContinue,
    resendCode,
    goBackToEmail,
  };
}
