"use client";

import { useState } from "react";

interface PlayerAvatarProps {
  src: string;
  name: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PlayerAvatar({ src, name, size = 40, className = "" }: PlayerAvatarProps) {
  const [error, setError] = useState(false);
  const showPhoto = !!src?.trim() && !error;

  if (!showPhoto) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-[11px] font-bold text-athletix-text-secondary ring-1 ring-white/10 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={!name}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setError(true)}
      className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
