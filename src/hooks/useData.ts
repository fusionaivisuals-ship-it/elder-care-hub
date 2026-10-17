import { useCallback, useEffect, useState } from "react";

/** Runs an async loader on the client; exposes loading / error / retry. */
export function useData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(undefined);
    loader()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading: !data && !error, retry };
}
