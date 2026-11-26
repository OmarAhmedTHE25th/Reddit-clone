import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PostSummarizer } from '../components/PostSummarizer';

interface HealthData {
  status: string;
  database: string;
  timestamp?: string;
}

export default function HomePage() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sampleTitle, setSampleTitle] = useState<string>(
    'Thoughts on balancing university projects and part-time work'
  );
  const [sampleContent, setSampleContent] = useState<string>(
    'This semester I have six courses along with part-time shifts. Starting early on small tasks and keeping notes organized helps a lot, though managing deadlines during busy weeks is still tough.'
  );

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<HealthData>('/health');
        if (isMounted) {
          setHealth(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to reach API server'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="page-container">
      <div className="profile-grid">
        {/* Main Feed & AI Summarizer Demo */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <section className="card card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldCheck size={24} color="var(--reddit-orange)" />
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
                Welcome to Reddit Clone
              </h1>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 0 }}>
              Authentication, rotating refresh-token sessions, public user profiles,
              profile editing, and user search are live and ready for the team.
            </p>

            {isAuthenticated && user ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                <Link to={`/u/${user.username}`} className="btn btn-primary">
                  View My Profile (u/{user.username})
                </Link>
                <Link to="/settings" className="btn btn-secondary">
                  Edit Profile Settings
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openAuthModal('register')}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openAuthModal('login')}
                >
                  Log In
                </button>
              </div>
            )}
          </section>

          <section className="card card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sparkles size={20} color="var(--reddit-orange)" />
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                AI Post Summarizer (Test Box)
              </h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 0 }}>
              Test summarizing any post title and body before connecting to live posts.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="ai-demo-title">
                Post Title
              </label>
              <input
                id="ai-demo-title"
                type="text"
                className="form-input"
                value={sampleTitle}
                onChange={(e) => setSampleTitle(e.target.value)}
                placeholder="Enter post title..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ai-demo-content">
                Post Content
              </label>
              <textarea
                id="ai-demo-content"
                className="form-textarea"
                rows={4}
                value={sampleContent}
                onChange={(e) => setSampleContent(e.target.value)}
                placeholder="Paste or type a post to summarize..."
              />
            </div>

            <PostSummarizer title={sampleTitle} content={sampleContent} />
          </section>
        </div>

        {/* Sidebar: Backend Health */}
        <aside className="card card-body">
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem' }}>
            Backend Status
          </h2>

          {loading && (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Checking Express &amp; Neon connectivity...
            </p>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {health && (
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                API: {health.status}
              </div>
              <div>
                <strong>Database:</strong> {health.database}
              </div>
              {health.timestamp && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Checked: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}