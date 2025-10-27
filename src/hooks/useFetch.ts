import { useState, useCallback } from "react";
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fetcher()); }
    catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, [fetcher]);
  return { data, loading, error, execute };
}
