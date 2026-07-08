/** Fixed locale so SSR and browser hydration produce identical date strings. */
const DISPLAY_LOCALE = "en-GB";

function parseISODateLocal(iso: string): Date {
  const [year, month, day] = iso.split("T")[0]!.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(DISPLAY_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

export function formatMatchDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(DISPLAY_LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function formatFixtureDayLabel(isoDate: string): string {
  try {
    return parseISODateLocal(isoDate).toLocaleDateString(DISPLAY_LOCALE, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return isoDate;
  }
}

export function formatShortDate(iso: string): string {
  try {
    return parseISODateLocal(iso.split("T")[0] ?? iso).toLocaleDateString(DISPLAY_LOCALE, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function offsetDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
