interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight in-memory TTL cache with stale fallback.
 * Serves expired data when upstream APIs are rate-limited.
 */
class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value as T;
  }

  getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    return entry ? (entry.value as T) : undefined;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    try {
      const value = await loader();
      this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      const stale = this.getStale<T>(key);
      if (stale !== undefined) {
        console.warn(`[Cache] Serving stale data for ${key}`);
        return stale;
      }
      throw error;
    }
  }

  /** Return stale data immediately while refreshing in the background. */
  async wrapStale<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const stale = this.getStale<T>(key);
    if (stale !== undefined) {
      void loader()
        .then((value) => this.set(key, value, ttlSeconds))
        .catch(() => undefined);
      return stale;
    }

    const value = await loader();
    this.set(key, value, ttlSeconds);
    return value;
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new MemoryCache();
