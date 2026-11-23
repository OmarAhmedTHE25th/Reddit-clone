import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Edit3, MessageSquare, FileText, Users } from 'lucide-react';
import { AxiosError } from 'axios';
import api, { PublicProfileUser } from '../api/axios';
import UserAvatar from '../components/common/UserAvatar';

type ProfileTab = 'overview' | 'posts' | 'comments';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    if (!username) return;

    let isMounted = true;
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<{ user: PublicProfileUser }>(
          `/users/${encodeURIComponent(username!)}`
        );
        if (isMounted) {
          setProfile(res.data.user);
        }
      } catch (err) {
        if (isMounted) {
          const axiosErr = err as AxiosError<{ error?: string }>;
          setError(
            axiosErr.response?.data?.error || 'Could not load user profile'
          );
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="card card-body">Loading u/{username}...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-container">
        <div className="card card-body" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <h2 style={{ margin: '0 0 8px' }}>User not found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {error || `Sorry, nobody on Reddit Clone goes by u/${username}.`}
          </p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const cakeDay = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="page-container">
      <div className="profile-grid">
        {/* Left Main Column */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              {(['overview', 'posts', 'comments'] as ProfileTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="btn"
                  style={{
                    background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
                    color:
                      activeTab === tab
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    textTransform: 'capitalize',
                    padding: '6px 14px',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
                u/{profile.username} hasn&apos;t shared any {activeTab === 'overview' ? 'activity' : activeTab} yet
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Posts and comments will appear here once the Posts &amp; Comments modules are integrated.
              </p>
            </div>
          </div>
        </div>

        {/* Right Reddit-Style Profile Sidebar */}
        <aside className="card">
          {/* Top Banner */}
          <div
            style={{
              height: '92px',
              background: 'linear-gradient(135deg, #0079d3 0%, #33a8ff 100%)',
            }}
          />

          <div className="card-body" style={{ paddingTop: 0 }}>
            <div
              style={{
                marginTop: '-42px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  border: '4px solid var(--bg-surface)',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  background: 'var(--bg-surface)',
                }}
              >
                <UserAvatar
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  size={76}
                />
              </div>

              {profile.isOwnProfile && (
                <Link
                  to="/settings"
                  className="btn btn-outline-blue"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Edit3 size={14} />
                  Edit Profile
                </Link>
              )}
            </div>

            <h1 style={{ margin: '0 0 2px', fontSize: '1.25rem' }}>
              {profile.displayName || profile.username}
            </h1>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              u/{profile.username}
            </div>

            {profile.bio ? (
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', lineHeight: 1.45 }}>
                {profile.bio}
              </p>
            ) : (
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No bio yet.
              </p>
            )}

            {/* Stats Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px 0',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '14px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '0.95rem' }}>
                  <FileText size={15} color="var(--reddit-blue)" />
                  {profile.counts.posts}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Posts
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '0.95rem' }}>
                  <MessageSquare size={15} color="var(--reddit-orange)" />
                  {profile.counts.comments}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Comments
                </div>
              </div>
            </div>

            {/* Cake Day */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <Calendar size={15} />
              <span>Cake day: <strong style={{ color: 'var(--text-primary)' }}>{cakeDay}</strong></span>
            </div>

            {/* Joined Communities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <Users size={14} />
                Joined Communities
              </div>
              {profile.joinedCommunities.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  No communities joined yet.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {profile.joinedCommunities.map((c) => (
                    <li key={c.id} style={{ padding: '4px 0', fontSize: '0.88rem', fontWeight: 600 }}>
                      r/{c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
