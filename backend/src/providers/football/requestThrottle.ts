/**
 * Limits outbound requests to stay within free-tier rate limits (e.g. 10/min).
 */
export class RequestThrottle {
  private timestamps: number[] = [];

  constructor(private readonly maxPerMinute: number) {}

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return fn();
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);

    if (this.timestamps.length >= this.maxPerMinute) {
      const oldest = this.timestamps[0] ?? now;
      const waitMs = 60_000 - (now - oldest) + 200;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.waitForSlot();
    }

    this.timestamps.push(Date.now());
  }
}

/** football-data.org free tier: 10 requests/minute — stay safely under. */
export const footballDataThrottle = new RequestThrottle(8);
