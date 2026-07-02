"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EmailStep } from "./EmailStep";
import { ErrorMessage } from "./ErrorMessage";
import { GuestButton } from "./GuestButton";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { OTPForm } from "./OTPForm";
import { SuccessAnimation } from "./SuccessAnimation";

export function AuthCard() {
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
    success,
    devCode,
    sendVerificationCode,
    verifyAndContinue,
    resendCode,
    goBackToEmail,
  } = useAuthFlow();

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="auth-glass-card w-full max-w-[440px] overflow-hidden rounded-[28px] p-6 sm:p-8"
    >
      {success ? (
        <SuccessAnimation />
      ) : (
        <>
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
                email={email}
                onEmailChange={setEmail}
                emailError={emailError}
                loading={loading}
                onSubmit={sendVerificationCode}
              />
            ) : (
              <OTPForm
                key="otp"
                email={email}
                otp={otp}
                onOtpChange={setOtp}
                loading={loading}
                resendCooldown={resendCooldown}
                hasError={Boolean(error)}
                devCode={devCode}
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

          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <GuestButton />
          </div>
        </>
      )}
    </motion.div>
  );
}
