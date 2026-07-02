"use client";

import { Mail } from "lucide-react";
import { InputHTMLAttributes, useId, useState } from "react";

interface EmailInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function EmailInput({
  error,
  id: externalId,
  value,
  onChange,
  onBlur,
  ...props
}: EmailInputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const [focused, setFocused] = useState(false);

  const stringValue = typeof value === "string" ? value : "";
  const hasValue = stringValue.length > 0;
  const floated = focused || hasValue;
  const showError = Boolean(error);

  return (
    <div className="w-full">
      <div
        className={`auth-input-field group relative min-h-[56px] overflow-hidden rounded-2xl border bg-white/[0.03] transition-all duration-300 ${
          showError
            ? "border-red-500/40"
            : focused
              ? "border-athletix-primary/50 auth-input-glow"
              : "border-white/[0.08] hover:border-white/[0.12]"
        }`}
      >
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-athletix-text-muted transition-colors duration-200 group-focus-within:text-athletix-primary">
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>

        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-11 z-10 origin-left text-athletix-text-muted transition-all duration-200 ease-out ${
            floated
              ? "top-2.5 translate-y-0 scale-[0.78] text-xs text-athletix-primary"
              : "top-1/2 -translate-y-1/2 scale-100 text-sm"
          } ${focused && !floated ? "text-athletix-primary" : ""}`}
        >
          Email Address
        </label>

        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className="relative w-full bg-transparent pb-3 pl-11 pr-4 pt-7 text-base text-white outline-none placeholder:text-transparent"
          {...props}
        />
      </div>

      {showError && (
        <p id={`${id}-error`} className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
