import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { AuthUser } from '../api/axios';
import UserAvatar from '../components/common/UserAvatar';

interface SearchResponse {
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

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setData(null);
      return;
    }

    let isMounted = true;
    async function runSearch() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<SearchResponse>('/users/search', {
          params: { q: trimmed, page, limit: 10 },
        });
        if (isMounted) {
          setData(res.data);
        }
      } catch {
        if (isMounted) {
          setError('Failed to search users. Please try again.');
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

  return (
    <div className="page-container" style={{ maxWidth: '760px' }}>
      <h1 style={{ fontSize: '1.3rem', margin: '0 0 16px' }}>
        People matching &ldquo;{q}&rdquo;
      </h1>

      {!q.trim() ? (
        <div className="card card-body">
          Enter a username or display name in the search bar above.
        </div>
      ) : loading ? (
        <div className="card card-body">Searching users...</div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : data && data.users.length === 0 ? (
        <div className="card card-body">
          No users matched <strong>{q}</strong>.
        </div>
      ) : (
        data && (
          <>
            <div className="card">
              {data.users.map((u, idx) => (
                <Link
                  key={u.id}
                  to={`/u/${u.username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size={44} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {u.displayName || u.username}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
                  <span className="btn btn-outline-blue" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                    View Profile
                  </span>
                </Link>
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
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
                  disabled={!data.pagination.hasPrevPage}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users)
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!data.pagination.hasNextPage}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
