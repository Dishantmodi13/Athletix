"use client";

import { Bell, Moon, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";

const NOTIFICATION_TYPES = [
  "Match Start",
  "Goal",
  "Half Time",
  "Full Time",
  "Red Card",
  "Penalty",
  "Transfer",
  "Breaking News",
];

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="flex w-full items-center justify-between py-3 text-sm"
    >
      <span className="text-white">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          on ? "bg-athletix-primary" : "bg-white/[0.1]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader title="Settings" icon={<SettingsIcon className="h-5 w-5" />} />

      <div className="auth-glass-card mb-6 rounded-2xl p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Bell className="h-4 w-4 text-athletix-primary" /> Notifications
        </h2>
        <div className="divide-y divide-white/[0.04]">
          {NOTIFICATION_TYPES.map((t, i) => (
            <Toggle key={t} label={t} defaultOn={i < 4} />
          ))}
        </div>
      </div>

      <div className="auth-glass-card rounded-2xl p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Moon className="h-4 w-4 text-athletix-primary" /> Appearance
        </h2>
        <div className="divide-y divide-white/[0.04]">
          <Toggle label="Dark theme" defaultOn />
          <Toggle label="Reduce motion" />
        </div>
      </div>
    </div>
  );
}
