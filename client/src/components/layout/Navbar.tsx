import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Settings, LogOut, User as UserIcon } from 'lucide-react';
import api, { AuthUser } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../common/UserAvatar';

export default function Navbar() {
  const { user, isAuthenticated, isLoading, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AuthUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live user search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get<{ users: AuthUser[] }>('/users/search', {
          params: { q: trimmed, limit: 5 },
        });
        setResults(res.data.users);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo-dot">r</span>
        <span>reddit</span>
      </Link>

      <div className="search-wrapper" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="search-input-box">
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="search"
            placeholder="Search users (u/username or display name)..."
            value={query}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            aria-label="Search users"
          />
        </form>

        {showDropdown && query.trim().length > 0 && (
          <div className="search-dropdown">
            {searching ? (
              <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Searching users...
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No users found for &ldquo;{query.trim()}&rdquo;
              </div>
            ) : (
              <>
                {results.map((u) => (
                  <div
                    key={u.id}
                    className="search-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setQuery('');
                      navigate(`/u/${u.username}`);
                    }}
                  >
                    <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        u/{u.username}
                      </div>
                      {u.displayName && (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {u.displayName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--reddit-blue)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  View all results for &ldquo;{query.trim()}&rdquo; →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="navbar-actions">
        {isLoading ? (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Loading...
          </span>
        ) : isAuthenticated && user ? (
          <>
            <Link
              to={`/u/${user.username}`}
              className="btn btn-secondary"
              style={{ padding: '5px 12px' }}
              title="View Profile"
            >
              <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size={24} />
              <span>u/{user.username}</span>
            </Link>
            <Link
              to="/settings"
              className="btn btn-ghost"
              title="User Settings"
              aria-label="User Settings"
            >
              <Settings size={18} />
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogout}
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openAuthModal('register')}
            >
              <UserIcon size={16} />
              Sign Up
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openAuthModal('login')}
            >
              Log In
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
