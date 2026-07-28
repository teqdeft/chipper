/**
 * Loads a single API resource with consistent loading / error / retry state.
 *
 * Deliberately small — no cache, no dedupe. Pages that need those should reach
 * for a query library; this exists so every screen renders the same three
 * states without hand-rolling them.
 *
 *   const { data, isLoading, error, reload } = useApiResource(
 *     () => userApi.publicProfile(handle),
 *     [handle],
 *   );
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '@/lib/api/errors';
import type { DescribedError } from '@/lib/api/errors';

type State<T> = {
  data: T | null;
  isLoading: boolean;
  error: DescribedError | null;
};

export function useApiResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<State<T>>({ data: null, isLoading: enabled, error: null });

  // Keeps the latest loader without making it a dependency — a caller passing an
  // inline arrow would otherwise re-fetch on every render.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  /** Tracks the newest request so a slow earlier one cannot overwrite it. */
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, isLoading: false, error: null });
    } catch (err) {
      if (id === requestId.current) {
        setState({ data: null, isLoading: false, error: describeError(err) });
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }
    void run();
    // Invalidate any in-flight request when the inputs change or we unmount.
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { ...state, reload: run, setData: (data: T) => setState({ data, isLoading: false, error: null }) };
}
