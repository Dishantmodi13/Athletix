"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { disableGuestMode } from "@/lib/auth";
import { saveAuthToken, sendOtp, verifyOtp } from "@/lib/api";
import { validateEmail } from "../EmailInput";

export type AuthStep = "email" | "otp";

export function useAuthFlow() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

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
      const result = await sendOtp(email.trim());
      setStep("otp");
      setOtp("");
      setResendCooldown(60);
      setDevCode(result.devCode ?? null);
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
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      triggerError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [email, otp, router, triggerError]);

  const resendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);

    try {
      const result = await sendOtp(email.trim());
      setOtp("");
      setResendCooldown(60);
      setDevCode(result.devCode ?? null);
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
    setDevCode(null);
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
    devCode,
    sendVerificationCode,
    verifyAndContinue,
    resendCode,
    goBackToEmail,
  };
}
