"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

interface GuestSignInDialogProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

export function GuestSignInDialog({
  open,
  onClose,
  feature = "this feature",
}: GuestSignInDialogProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-dialog-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="auth-glass-card relative w-full max-w-md rounded-3xl p-6 sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-athletix-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletix-primary/50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 id="guest-dialog-title" className="mb-2 pr-8 text-xl font-bold text-white">
            Sign in to unlock {feature}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-athletix-text-muted">
            Create a free account to follow players, save preferences, receive
            notifications, and access AI-powered personalization.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="auth-primary-btn flex min-h-[48px] flex-1 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              onClick={onClose}
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="auth-secondary-btn min-h-[48px] flex-1 rounded-2xl text-sm font-semibold"
            >
              Continue browsing
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
