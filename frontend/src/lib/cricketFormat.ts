import type { CricketMatch } from "@/lib/cricket";

const FORMAT_STYLES: Record<string, string> = {
  T20I: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  T20: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  ODI: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  Test: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export function matchFormatDisplay(match: Pick<CricketMatch, "format" | "matchLabel">): string {
  if (match.matchLabel) return match.matchLabel;
  if (match.format) return match.format;
  return "";
}

export function matchFormatStyle(format: string | null): string {
  if (!format) return "bg-white/[0.06] text-athletix-text-muted ring-white/10";
  return FORMAT_STYLES[format] ?? FORMAT_STYLES[format.toUpperCase()] ?? FORMAT_STYLES.T20I!;
}
