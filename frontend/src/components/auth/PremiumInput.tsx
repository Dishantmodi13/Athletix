"use client";

import { Eye, EyeOff } from "lucide-react";
import { InputHTMLAttributes, ReactNode, useId, useState } from "react";
import { motion } from "framer-motion";

interface PremiumInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  icon?: ReactNode;
  error?: string;
}

export function PremiumInput({
  label,
  icon,
  type = "text",
  error,
  id: externalId,
  ...props
}: PremiumInputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;
  const floated = focused || hasValue;

  return (
    <div className="w-full">
      <div
        className={`auth-input-glow relative rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-300 ${
          focused ? "border-athletix-primary/40" : ""
        }`}
      >
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-athletix-text-muted">
            {icon}
          </div>
        )}

        <motion.label
          htmlFor={id}
          animate={{
            y: floated ? -28 : 0,
            x: floated && icon ? -8 : 0,
            scale: floated ? 0.85 : 1,
          }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
          className={`pointer-events-none absolute top-1/2 z-10 origin-left -translate-y-1/2 text-sm transition-colors duration-200 ${
            icon ? "left-11" : "left-4"
          } ${focused ? "text-athletix-primary" : "text-athletix-text-muted"}`}
        >
          {label}
        </motion.label>

        <input
          id={id}
          type={inputType}
          className={`w-full rounded-2xl bg-transparent px-4 pb-3 pt-6 text-sm text-white outline-none transition-colors placeholder:text-transparent ${
            icon ? "pl-11" : ""
          } ${isPassword ? "pr-12" : ""}`}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            setHasValue(e.target.value.length > 0);
          }}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            props.onChange?.(e);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-athletix-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
