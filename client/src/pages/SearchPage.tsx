import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { AuthUser } from '../api/axios';
import {
  searchPosts as searchPostsApi,
  type SearchPostsResponse,
} from '../api/posts';
import UserAvatar from '../components/common/UserAvatar';
import PostCard from '../components/feed/PostCard';

interface UsersResponse {
  users: AuthUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [posts, setPosts] = useState<SearchPostsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setUsers(null);
      setPosts(null);
      return;
    }

    let isMounted = true;
    async function runSearch() {
      try {
        setLoading(true);
        setError(null);

        const [usersRes, postsRes] = await Promise.all([
          api.get<UsersResponse>('/users/search', {
            params: { q: trimmed, page, limit: 10 },
          }),
          searchPostsApi(trimmed, page, 10),
        ]);

        if (isMounted) {
          setUsers(usersRes.data);
          setPosts(postsRes);
        }
      } catch {
        if (isMounted) {
          setError('Failed to search. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    runSearch();
    return () => {
      isMounted = false;
    };
  }, [q, page]);

  function goToPage(nextPage: number) {
    setSearchParams({ q, page: String(nextPage) });
  }

  function removePost(id: string) {
    setPosts((current) =>
      current
        ? { ...current, items: current.items.filter((post) => post.id !== id) }
        : current
    );
  }

  const hasPrev = page > 1;
  const hasNext =
    Boolean(posts?.pagination.hasNextPage) ||
    Boolean(users?.pagination.hasNextPage);

  return (
    <div className="page-container" style={{ maxWidth: '760px' }}>
      <h1 style={{ fontSize: '1.3rem', margin: '0 0 16px' }}>
        Results for &ldquo;{q}&rdquo;
      </h1>

      {!q.trim() ? (
        <div className="card card-body">
          Search for posts, usernames, or display names using the bar above.
        </div>
      ) : loading ? (
        <div className="card card-body">Searching...</div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <>
          <section className="search-section">
            <h2 className="search-section-title">Posts</h2>

            {posts && posts.items.length > 0 ? (
              <div className="search-post-list">
                {posts.items.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDeleted={removePost}
                  />
                ))}
              </div>
            ) : (
              <div className="card card-body">
                No posts matched <strong>{q}</strong>.
              </div>
            )}
          </section>

          <section className="search-section">
            <h2 className="search-section-title">People</h2>

            {users && users.users.length > 0 ? (
              <div className="card">
                {users.users.map((u, idx) => (
                  <Link
                    key={u.id}
                    to={`/u/${u.username}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      borderTop:
                        idx === 0 ? 'none' : '1px solid var(--border-color)',
                    }}
                  >
                    <UserAvatar
                      username={u.username}
                      avatarUrl={u.avatarUrl}
                      size={44}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {u.displayName || u.username}
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        u/{u.username}
                      </div>
                      {u.bio && (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {u.bio}
                        </p>
                      )}
                    </div>
                    <span
                      className="btn btn-outline-blue"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      View Profile
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card card-body">
                No users matched <strong>{q}</strong>.
              </div>
            )}
          </section>

          {(hasPrev || hasNext) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!hasPrev}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </button>
              <span
                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
              >
                Page {page}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!hasNext}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
