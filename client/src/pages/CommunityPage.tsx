import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchCommunity,
  fetchCommunityPosts,
  joinCommunity,
  leaveCommunity,
  type CommunityResponse,
} from '../api/posts';
import { useFeed } from '../hooks/useFeed';
import AppShell from '../components/layout/AppShell';
import { CommunitySidebar } from '../components/layout/Sidebars';
import SortBar, { type SortState } from '../components/feed/SortBar';
import InfiniteFeed from '../components/feed/InfiniteFeed';
import PostCard from '../components/feed/PostCard';
import CommunityIcon from '../components/common/CommunityIcon';
import UserAvatar from '../components/common/UserAvatar';
import { formatMembers } from '../utils/format';

export default function CommunityPage() {
  const { community: name = '' } = useParams();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CommunityResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setNotFound(false);
    fetchCommunity(name)
      .then((next) => {
        if (!active) return;
        setData(next);
        setJoined(next.viewerJoined);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [name]);

  const requested = searchParams.get('sort');
  const sort = requested && requested !== 'best' ? requested : 'hot';
  const t = searchParams.get('t') ?? 'day';
  const state = useFeed(`${name}:${sort}:${t}`, (cursor) =>
    fetchCommunityPosts(name, { sort, t, cursor })
  );

  function handleSort(next: SortState) {
    const params = new URLSearchParams(searchParams);
    params.set('sort', next.sort);
    params.set('t', next.t);
    setSearchParams(params, { replace: true });
  }

  async function toggleJoin() {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    const next = !joined;
    setJoined(next);
    try {
      if (next) await joinCommunity(name);
      else await leaveCommunity(name);
    } catch {
      setJoined(!next);
    }
  }

  if (notFound) {
    return (
      <AppShell>
        <div className="empty-state">
          <h2>Sorry, there aren&apos;t any communities on this site by that name.</h2>
          <Link to="/popular" className="btn btn-primary">
            Browse popular communities
          </Link>
        </div>
      </AppShell>
    );
  }

  const community = data?.community;

  return (
    <AppShell
      right={
        community ? (
          <CommunitySidebar
            community={community}
            joined={joined}
            onToggle={toggleJoin}
          />
        ) : undefined
      }
    >
      {community && (
        <>
          <section className="community-header">
            <div className="community-banner" />
            <div className="community-header-body">
              <CommunityIcon
                name={community.name}
                iconUrl={community.iconUrl}
                size={64}
              />
              <div className="community-header-text">
                <h1 className="community-name">r/{community.name}</h1>
                <p className="community-meta">
                  {formatMembers(community.memberCount)} members •{' '}
                  {formatMembers(community.postCount)} posts
                </p>
              </div>
              <button
                type="button"
                className={
                  joined
                    ? 'btn btn-outline-blue join-toggle'
                    : 'btn btn-primary'
                }
                onClick={toggleJoin}
              >
                <span className="join-label">
                  {joined ? 'Joined' : 'Join'}
                </span>
                {joined && <span className="leave-label">Leave</span>}
              </button>
              <Link
                to={`/r/${community.name}/submit`}
                className="btn btn-primary"
              >
                Create Post
              </Link>
            </div>
          </section>
          <div className="create-post-bar">
            <UserAvatar
              username={user?.username ?? 'guest'}
              avatarUrl={user?.avatarUrl ?? null}
              size={32}
            />
            <Link to={`/r/${community.name}/submit`}>Create Post</Link>
          </div>

          <div className="feed-header">
            <span className="feed-title">Posts</span>
            <SortBar sort={sort} t={t} onChange={handleSort} />
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
              <PostCard
                key={post.id}
                post={post}
                showCommunity={false}
                onDeleted={state.removeItem}
              />
            )}
            empty={
              <div className="empty-state">
                <h2>There are no posts in r/{community.name} yet</h2>
                <p>Be the first to post.</p>
                <Link
                  to={`/r/${community.name}/submit`}
                  className="btn btn-primary"
                >
                  Create Post
                </Link>
              </div>
            }
          />
        </>
      )}
    </AppShell>
  );
}
