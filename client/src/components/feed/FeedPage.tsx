import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchFeed } from '../../api/posts';
import { useFeed } from '../../hooks/useFeed';
import AppShell from '../layout/AppShell';
import SortBar, { type SortState } from './SortBar';
import InfiniteFeed from './InfiniteFeed';
import PostCard from './PostCard';

interface Props {
  feed: 'home' | 'popular';
  title: string;
  defaultSort: string;
  showBest?: boolean;
  right?: ReactNode;
  emptyTitle: string;
  emptyBody: string;
  emptyCta?: { to: string; label: string };
}

export default function FeedPage({
  feed,
  title,
  defaultSort,
  showBest,
  right,
  emptyTitle,
  emptyBody,
  emptyCta,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('sort');
  const sort =
    requested && (showBest || requested !== 'best') ? requested : defaultSort;
  const t = searchParams.get('t') ?? 'day';

  const state = useFeed(`${feed}:${sort}:${t}`, (cursor) =>
    fetchFeed({ feed, sort, t, cursor })
  );

  function handleSort(next: SortState) {
    const params = new URLSearchParams(searchParams);
    params.set('sort', next.sort);
    params.set('t', next.t);
    setSearchParams(params, { replace: true });
  }

  const empty = (
    <div className="empty-state">
      <h2>{emptyTitle}</h2>
      <p>{emptyBody}</p>
      {emptyCta && (
        <Link to={emptyCta.to} className="btn btn-primary">
          {emptyCta.label}
        </Link>
      )}
    </div>
  );

  return (
    <AppShell right={right}>
      <div className="feed-header">
        <h1 className="feed-title">{title}</h1>
        <SortBar sort={sort} t={t} onChange={handleSort} showBest={showBest} />
      </div>
      <InfiniteFeed
        items={state.items}
        loading={state.loading}
        loadingMore={state.loadingMore}
        error={state.error}
        hasMore={state.hasMore}
        onLoadMore={state.loadMore}
        onRetry={state.reload}
        renderItem={(post) => (
          <PostCard key={post.id} post={post} onDeleted={state.removeItem} />
        )}
        empty={empty}
      />
    </AppShell>
  );
}
