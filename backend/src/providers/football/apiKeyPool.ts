import { AppError } from "../../middleware/errorHandler";
export class ApiKeyPool {
  private exhaustedUntil = new Map<string, number>();

  constructor(private readonly keys: string[]) {
    this.keys = keys.map((k) => k.trim()).filter(Boolean);
  }

  get size(): number {
    return this.keys.length;
  }

  hasKeys(): boolean {
    return this.keys.length > 0;
  }

  /** Returns the next available key, or null if all are exhausted. */
  nextKey(): string | null {
    const now = Date.now();
    for (const key of this.keys) {
      const until = this.exhaustedUntil.get(key) ?? 0;
      if (now >= until) {
        return key;
      }
    }
    return null;
  }

  /** Mark a key unavailable for a cooldown period (default 60s). */
  markExhausted(key: string, cooldownMs = 60_000): void {
    this.exhaustedUntil.set(key, Date.now() + cooldownMs);
    console.warn(`[ApiKeyPool] Key …${key.slice(-4)} exhausted for ${cooldownMs / 1000}s`);
  }

  /** Detect daily quota errors and apply a longer cooldown. */
  markExhaustedFromError(key: string, error: unknown): void {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    const isDaily = msg.includes("request limit for the day") || msg.includes("per day");
    const isMinute = msg.includes("rate limit") && !isDaily;
    const cooldown = isDaily ? 24 * 60 * 60_000 : isMinute ? 65_000 : 60_000;
    this.markExhausted(key, cooldown);
  }

  /** Try each available key until one succeeds. */
  async execute<T>(
    fn: (key: string) => Promise<T>,
    shouldRotate: (error: unknown) => boolean
  ): Promise<T> {
    if (!this.hasKeys()) {
      throw new AppError("No API keys configured", 503);
    }

    const tried = new Set<string>();
    let lastError: unknown;

    while (tried.size < this.keys.length) {
      const key = this.nextKey();
      if (!key || tried.has(key)) break;
      tried.add(key);

      try {
        return await fn(key);
      } catch (error) {
        lastError = error;
        if (shouldRotate(error)) {
          this.markExhaustedFromError(key, error);
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof AppError
      ? lastError
      : new AppError(
          lastError instanceof Error ? lastError.message : "All API keys exhausted",
          429
        );
  }
}

export function parseKeyList(...sources: (string | undefined)[]): string[] {
  const keys: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    source.split(",").forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) keys.push(trimmed);
    });
  }
  return [...new Set(keys)];
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes("do not have access to this season")) return false;
  return (
    msg.includes("rate limit") ||
    msg.includes("request limit") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("too many") ||
    msg.includes("free plans") ||
    msg.includes("exceeded") ||
    msg.includes("reached the") ||
    msg.includes("not have access") ||
    msg.includes("all api keys exhausted")
  );
}
