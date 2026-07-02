"use client";

interface CountdownTimerProps {
  seconds: number;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CountdownTimer({ seconds }: CountdownTimerProps) {
  if (seconds <= 0) return null;

  return (
    <p className="text-center text-xs text-athletix-text-muted" aria-live="polite">
      Resend available in{" "}
      <span className="font-mono font-medium text-athletix-text-secondary">
        {formatTime(seconds)}
      </span>
    </p>
  );
}
