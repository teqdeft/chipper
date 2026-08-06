import { useCallback, useEffect, useState } from 'react';

/**
 * Search box state that fires the query as the user types (debounced), with an
 * optional `flush()` for Enter / explicit submit.
 */
export function useLiveSearch(delay = 300) {
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const next = value.trim();
    const timer = window.setTimeout(() => setQuery(next), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  const flush = useCallback(() => {
    setQuery(value.trim());
  }, [value]);

  const clear = useCallback(() => {
    setValue('');
    setQuery('');
  }, []);

  return { value, setValue, query, flush, clear };
}
