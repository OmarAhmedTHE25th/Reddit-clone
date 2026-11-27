import { useEffect, useRef, type ReactNode } from 'react';
import PostSkeleton from './PostSkeleton';

interface Props<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  renderItem: (item: T) => ReactNode;
  empty: ReactNode;
  skeletonCount?: number;
}

export default function InfiniteFeed<T extends { id: string }>({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  renderItem,
  empty,
  skeletonCount = 3,
}: Props<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <PostSkeleton key={index} />
        ))}
      </>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="empty-state">
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <>
      {items.map(renderItem)}

      {loadingMore && <PostSkeleton />}

      {error && items.length > 0 && (
        <div className="load-more-error">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onLoadMore}
          >
            Load more
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="feed-sentinel" />

      {!hasMore && !error && (
        <p className="end-of-feed">You&apos;ve reached the end</p>
      )}
    </>
  );
}
