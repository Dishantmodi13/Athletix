"use client";

import { useState } from "react";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 28, className = "" }: TeamLogoProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-athletix-text-muted ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setError(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
