import { useCallback, useEffect, useRef, useState } from 'react';

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function useFeed<T extends { id: string }>(
  key: string,
  loadPage: (cursor: string | null) => Promise<Page<T>>
) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;

  const reload = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    loadingRef.current = true;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setItems([]);
    setNextCursor(null);
    cursorRef.current = null;

    try {
      const page = await loadPageRef.current(null);
      if (requestId !== requestRef.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
      cursorRef.current = page.nextCursor;
    } catch {
      if (requestId === requestRef.current) {
        setError('Could not load posts.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursorRef.current) return;

    loadingRef.current = true;
    setLoadingMore(true);
    setError(null);
    const requestId = requestRef.current;

    try {
      const page = await loadPageRef.current(cursorRef.current);
      if (requestId !== requestRef.current) return;

      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [
          ...previous,
          ...page.items.filter((item) => !seen.has(item.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      cursorRef.current = page.nextCursor;
    } catch {
      if (requestId === requestRef.current) {
        setError('Could not load more posts.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(nextCursor),
    loadMore,
    reload,
    removeItem,
  };
}
