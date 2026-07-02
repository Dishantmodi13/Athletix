interface AthletixLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 36, text: "text-xl" },
  lg: { icon: 44, text: "text-2xl" },
};

export function AthletixLogo({ className = "", size = "md" }: AthletixLogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="Athletix">
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-athletix-primary/20 to-athletix-secondary/10 ring-1 ring-white/10"
        style={{ width: icon, height: icon }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-athletix-primary"
          aria-hidden="true"
        >
          <path
            d="M12 2L4 6.5V12c0 4.5 3.4 8.7 8 9.5 4.6-.8 8-5 8-9.5V6.5L12 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 2v19.5M4 6.5l8 4.5 8-4.5M4 12l8 4.5 8-4.5"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        </svg>
        <div className="absolute inset-0 rounded-xl bg-athletix-primary/10 blur-md" />
      </div>
      <span className={`font-bold tracking-tight text-white ${text}`}>
        Athlet<span className="text-athletix-primary">ix</span>
      </span>
    </div>
  );
}
