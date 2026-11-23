import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Sparkles, ArrowLeft } from 'lucide-react';
import api, { AuthUser } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/common/UserAvatar';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, openAuthModal, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setBio(user.bio ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="card card-body">Loading settings...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="page-container">
        <div className="card card-body" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <h2 style={{ margin: '0 0 8px' }}>Sign in to edit your profile</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            You need to be logged in to access User Settings.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openAuthModal('login')}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  function handleGenerateAvatar() {
    const seed = `${user!.username}-${Math.floor(Math.random() * 10000)}`;
    setAvatarUrl(`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (displayName.trim().length > 50) {
      setError('Display name must be at most 50 characters.');
      return;
    }
    if (bio.trim().length > 300) {
      setError('Bio must be at most 300 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch<{ user: AuthUser }>('/users/me', {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      updateUser(res.data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      const axiosErr = err as AxiosError<{
        error?: string;
        details?: Array<{ message: string }>;
      }>;
      const msg =
        axiosErr.response?.data?.details?.[0]?.message ||
        axiosErr.response?.data?.error ||
        'Failed to update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link
          to={`/u/${user.username}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--reddit-blue)',
          }}
        >
          <ArrowLeft size={16} />
          Back to u/{user.username}
        </Link>
      </div>

      <div className="card">
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem' }}>User Settings</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Customize how your profile appears to other Redditors.
          </p>
        </div>

        <div className="card-body" style={{ padding: '24px' }}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            {/* Avatar Preview Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
                padding: '14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <UserAvatar
                username={user.username}
                avatarUrl={avatarUrl || null}
                size={64}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {displayName || user.username}
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  u/{user.username}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGenerateAvatar}
                style={{ fontSize: '0.8rem', padding: '7px 12px' }}
              >
                <Sparkles size={14} />
                Random Avatar
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-display-name">
                Display Name
              </label>
              <input
                id="settings-display-name"
                type="text"
                className="form-input"
                maxLength={50}
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {50 - displayName.length} characters remaining
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-bio">
                About (Bio)
              </label>
              <textarea
                id="settings-bio"
                className="form-textarea"
                rows={4}
                maxLength={300}
                placeholder="A brief description of yourself shown on your profile."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {300 - bio.length} characters remaining
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-avatar-url">
                Avatar Image URL
              </label>
              <input
                id="settings-avatar-url"
                type="url"
                className="form-input"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Leave blank to use your default initial avatar.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Link to={`/u/${user.username}`} className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
