export function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

export function formatMatchDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
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
