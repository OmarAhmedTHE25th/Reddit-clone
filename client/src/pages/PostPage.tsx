import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Link2,
  MessageSquare,
  Pencil,
  Share,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVote } from '../hooks/useVote';
import {
  deletePost,
  fetchPost,
  removePost,
  updatePost,
  type PostDto,
} from '../api/posts';
import { formatScore, safeHostname, timeAgo } from '../utils/format';
import AppShell from '../components/layout/AppShell';
import VotePill from '../components/feed/VotePill';
import CommunityIcon from '../components/common/CommunityIcon';
import UserAvatar from '../components/common/UserAvatar';
import { PostSummarizer } from '../components/PostSummarizer';

export default function PostPage() {
  const { postId = '' } = useParams();
  const [post, setPost] = useState<PostDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPost(null);
    setError(null);
    fetchPost(postId)
      .then((next) => {
        if (active) setPost(next);
      })
      .catch(() => {
        if (active) setError('Post not found.');
      });
    return () => {
      active = false;
    };
  }, [postId]);

  if (error) {
    return (
      <AppShell>
        <div className="empty-state">
          <h2>{error}</h2>
          <Link to="/" className="btn btn-primary">
            Go home
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell>
        <div className="empty-state">Loading post...</div>
      </AppShell>
    );
  }

  return <PostDetail post={post} onChanged={setPost} />;
}

function PostDetail({
  post,
  onChanged,
}: {
  post: PostDto;
  onChanged: (post: PostDto) => void;
}) {
  const { user } = useAuth();
  const { score, myVote, vote, error: voteError } = useVote(post);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? '');
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const postUrl = `/r/${post.community.name}/comments/${post.id}/${post.slug}`;
  const isAuthor = user?.id === post.author.id;
  const canEdit = isAuthor && post.status === 'ACTIVE';

  function stopEditing() {
    setEditing(false);
    const params = new URLSearchParams(searchParams);
    params.delete('edit');
    setSearchParams(params, { replace: true });
  }

  async function save() {
    setActionError(null);
    try {
      const updated = await updatePost(post.id, { title, body });
      onChanged(updated);
      stopEditing();
    } catch {
      setActionError('Could not save the post.');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(post.id);
      navigate(`/r/${post.community.name}`);
    } catch {
      setActionError('Could not delete the post.');
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this post from the community?')) return;
    try {
      await removePost(post.id);
      onChanged(await fetchPost(post.id));
    } catch {
      setActionError('Could not remove the post.');
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${postUrl}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionError('Could not copy the link.');
    }
  }

  return (
    <AppShell>
      <article className="post-detail">
        <Link to={`/r/${post.community.name}`} className="back-link">
          <ArrowLeft size={18} /> Back to r/{post.community.name}
        </Link>

        <div className="post-header">
          <Link to={`/r/${post.community.name}`} className="post-community">
            <CommunityIcon
              name={post.community.name}
              iconUrl={post.community.iconUrl}
              size={20}
            />
            <span>r/{post.community.name}</span>
          </Link>
          <span className="post-dot">•</span>
          <span className="post-time">
            Posted by u/{post.author.username} • {timeAgo(post.createdAt)}
          </span>
        </div>

        {post.status !== 'ACTIVE' ? (
          <>
            <h1 className="post-detail-title">
              {post.status === 'DELETED' ? '[deleted]' : '[removed]'}
            </h1>
            <p className="muted">
              {post.status === 'DELETED'
                ? 'This post was deleted by its author.'
                : `Removed by the moderators of r/${post.community.name}.`}
            </p>
          </>
        ) : editing ? (
          <div className="post-edit-form">
            <input
              className="title-input"
              value={title}
              maxLength={300}
              onChange={(event) => setTitle(event.target.value)}
            />
            <textarea
              className="body-input"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="post-edit-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={stopEditing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={!title.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="post-detail-title">{post.title}</h1>
            {post.type === 'LINK' && post.url ? (
              <a
                className="post-link"
                href={post.url}
                target="_blank"
                rel="noreferrer"
              >
                <Link2 size={14} /> {safeHostname(post.url)}
              </a>
            ) : (
              post.body && <p className="post-detail-body">{post.body}</p>
            )}
          </>
        )}
        <div className="post-actions">
          <VotePill score={score} value={myVote} onVote={vote} />
          <span className="action-pill">
            <MessageSquare size={18} /> {formatScore(post.commentCount)}
          </span>
          <button type="button" className="action-pill" onClick={handleShare}>
            <Share size={18} /> {copied ? 'Copied' : 'Share'}
          </button>
          {canEdit && (
            <button
              type="button"
              className="action-pill"
              onClick={() => setEditing(true)}
            >
              <Pencil size={18} /> Edit
            </button>
          )}
          {isAuthor && post.status === 'ACTIVE' && (
            <button
              type="button"
              className="action-pill"
              onClick={handleDelete}
            >
              <Trash2 size={18} /> Delete
            </button>
          )}
          {post.viewerIsModerator && post.status === 'ACTIVE' && (
            <button
              type="button"
              className="action-pill"
              onClick={handleRemove}
            >
              <ShieldX size={18} /> Remove
            </button>
          )}
        </div>
        {(voteError || actionError) && (
          <p className="post-action-error">{voteError ?? actionError}</p>
        )}
        {post.status === 'ACTIVE' && post.body && (
          <div className="post-summarizer">
            <PostSummarizer title={post.title} content={post.body} />
          </div>
        )}
      </article>
      <section className="comments-card">
        <h2 className="comments-title">
          {formatScore(post.commentCount)} comments
        </h2>
        <div className="comment-composer-placeholder">
          <UserAvatar
            username={user?.username ?? 'guest'}
            avatarUrl={user?.avatarUrl ?? null}
            size={32}
          />
          <span>Add a comment</span>
        </div>
        <p className="muted">
          Comment threads are handled by the comments module and will appear
          here.
        </p>
      </section>
    </AppShell>
  );
}
