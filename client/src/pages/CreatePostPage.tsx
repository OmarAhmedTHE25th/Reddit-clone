import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createPost,
  fetchCommunities,
  type CommunitySummary,
} from '../api/posts';
import AppShell from '../components/layout/AppShell';

export default function CreatePostPage() {
  const { community: communityParam } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [community, setCommunity] = useState(communityParam ?? '');
  const [type, setType] = useState<'TEXT' | 'LINK'>('TEXT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCommunities(undefined, 100)
      .then((next) => {
        if (active) setCommunities(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (communityParam) setCommunity(communityParam);
  }, [communityParam]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const post = await createPost(community, {
        title: title.trim(),
        body: type === 'TEXT' ? body : null,
        type,
        url: type === 'LINK' ? url : null,
      });
      navigate(`/r/${community}/comments/${post.id}/${post.slug}`);
    } catch {
      setError('Could not create the post. Check the community and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="empty-state">
          <h2>Log in to create a post</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openAuthModal('login')}
          >
            Log in
          </button>
        </div>
      </AppShell>
    );
  }

  const disabled =
    !community || !title.trim() || (type === 'LINK' && !url) || submitting;

  return (
    <AppShell>
      <div className="create-post-page">
        <h1 className="create-post-heading">Create post</h1>

        <label className="form-label" htmlFor="community">
          Community
        </label>
        <select
          id="community"
          className="community-select"
          value={community}
          onChange={(event) => setCommunity(event.target.value)}
        >
          <option value="">Choose a community</option>
          {communities.map((item) => (
            <option key={item.id} value={item.name}>
              r/{item.name}
            </option>
          ))}
        </select>

        <div className="tabs">
          <button
            type="button"
            className={`tab${type === 'TEXT' ? ' active' : ''}`}
            onClick={() => setType('TEXT')}
          >
            Text
          </button>
          <button
            type="button"
            className={`tab${type === 'LINK' ? ' active' : ''}`}
            onClick={() => setType('LINK')}
          >
            Link
          </button>
        </div>

        <input
          className="title-input"
          placeholder="Title"
          value={title}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="char-count">{title.length}/300</div>

        {type === 'TEXT' ? (
          <textarea
            className="body-input"
            placeholder="Text (optional)"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        ) : (
          <input
            className="title-input"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        )}

        {error && <div className="alert alert-error">{error}</div>}
        <div className="create-post-actions">
          <Link
            to={community ? `/r/${community}` : '/'}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled}
            onClick={submit}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
