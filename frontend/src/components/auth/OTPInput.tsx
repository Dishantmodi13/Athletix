"use client";

import { motion } from "framer-motion";
import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

const LENGTH = 6;

export function OTPInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  error = false,
}: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const focusAt = (index: number) => {
    inputsRef.current[Math.max(0, Math.min(index, LENGTH - 1))]?.focus();
  };

  const setDigits = (next: string[]) => {
    onChange(next.join("").replace(/\D/g, "").slice(0, LENGTH));
  };

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < LENGTH - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        focusAt(index - 1);
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
      }
      e.preventDefault();
    }
    if (e.key === "ArrowLeft") focusAt(index - 1);
    if (e.key === "ArrowRight") focusAt(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    onChange(pasted);
    focusAt(Math.min(pasted.length, LENGTH - 1));
  };

  return (
    <div
      className="flex w-full justify-center gap-2 sm:gap-2.5"
      role="group"
      aria-label="6-digit verification code"
    >
      {digits.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3 }}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={`auth-otp-box h-14 w-11 shrink-0 rounded-xl border bg-white/[0.04] text-center text-xl font-semibold text-white outline-none transition-all duration-200 sm:h-[60px] sm:w-12 sm:text-2xl ${
            error
              ? "border-red-500/50"
              : "border-white/[0.1] focus:border-athletix-primary/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
