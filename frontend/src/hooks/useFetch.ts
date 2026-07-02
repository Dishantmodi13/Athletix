"use client";

import { useCallback, useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic client-side data fetching hook with loading + error states.
 * Set `enabled` to false to skip fetching (e.g. lazy-load per tab).
 */
export function useFetch<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  return { data, loading, error, refetch };
}
