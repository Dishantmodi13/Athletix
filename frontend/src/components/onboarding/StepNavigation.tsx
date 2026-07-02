"use client";

import { AnimatedButton } from "./AnimatedButton";

interface StepNavigationProps {
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
}

export function StepNavigation({
  onBack,
  onContinue,
  onSkip,
  continueLabel = "Continue",
  continueDisabled = false,
  showBack = true,
  showSkip = false,
}: StepNavigationProps) {
  return (
    <div className="mt-auto flex items-center justify-between gap-4 pt-10">
      <div>
        {showBack && onBack && (
          <AnimatedButton variant="ghost" onClick={onBack}>
            Back
          </AnimatedButton>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showSkip && onSkip && (
          <AnimatedButton variant="outline" onClick={onSkip}>
            Skip
          </AnimatedButton>
        )}
        {onContinue && (
          <AnimatedButton
            onClick={onContinue}
            disabled={continueDisabled}
            className="min-w-[140px]"
          >
            {continueLabel}
          </AnimatedButton>
        )}
      </div>
    </div>
  );
}
