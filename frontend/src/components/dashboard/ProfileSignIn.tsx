"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { EmailStep } from "@/components/auth/EmailStep";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { useAuthFlow } from "@/components/auth/hooks/useAuthFlow";
import { OTPForm } from "@/components/auth/OTPForm";
import { useUser } from "@/context/UserContext";

export function ProfileSignIn() {
  const { refreshUser } = useUser();
  const {
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
    sendVerificationCode,
    verifyAndContinue,
    resendCode,
    goBackToEmail,
  } = useAuthFlow({
    redirectTo: false,
    onVerified: refreshUser,
  });

  return (
    <div className="auth-glass-card rounded-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-athletix-primary/15 text-athletix-primary">
          <LogIn className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Sign in with email</h2>
          <p className="text-sm text-athletix-text-muted">
            We&apos;ll send a one-time code to your email inbox.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && step === "otp" && (
          <motion.div
            key={`err-${shakeKey}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <ErrorMessage message={error} shakeKey={shakeKey} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === "email" ? (
          <EmailStep
            key="email"
            variant="profile"
            email={email}
            onEmailChange={setEmail}
            emailError={emailError}
            loading={loading}
            onSubmit={sendVerificationCode}
          />
        ) : (
          <OTPForm
            key="otp"
            variant="profile"
            email={email}
            otp={otp}
            onOtpChange={setOtp}
            loading={loading}
            resendCooldown={resendCooldown}
            hasError={Boolean(error)}
            onSubmit={verifyAndContinue}
            onResend={resendCode}
            onBack={goBackToEmail}
          />
        )}
      </AnimatePresence>

      {step === "email" && error && (
        <div className="mt-4">
          <ErrorMessage message={error} shakeKey={shakeKey} />
        </div>
      )}
    </div>
  );
}
