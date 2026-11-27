import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Share,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVote } from '../../hooks/useVote';
import {
  deletePost,
  joinCommunity,
  removePost,
  type PostDto,
} from '../../api/posts';
import {
  formatFullDate,
  formatScore,
  safeHostname,
  splitTldr,
  timeAgo,
} from '../../utils/format';
import CommunityIcon from '../common/CommunityIcon';
import VotePill from './VotePill';

interface Props {
  post: PostDto;
  showCommunity?: boolean;
  onDeleted?: (id: string) => void;
  onVoteChange?: (id: string, score: number, myVote: number) => void;
}

export default function PostCard({
  post,
  showCommunity = true,
  onDeleted,
  onVoteChange,
}: Props) {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { score, myVote, vote, error: voteError } = useVote(post, (nextScore, nextVote) =>
    onVoteChange?.(post.id, nextScore, nextVote)
  );

  const [joined, setJoined] = useState(post.viewerJoined);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  const postUrl = `/r/${post.community.name}/comments/${post.id}/${post.slug}`;
  const isAuthor = user?.id === post.author.id;
  const canEdit = isAuthor && post.status === 'ACTIVE';
  const canRemove =
    Boolean(post.viewerIsModerator) && post.status === 'ACTIVE';
  const tldr = splitTldr(post.title);

  function closeMenu() {
    menuRef.current?.removeAttribute('open');
  }

  async function handleJoin() {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    setJoined(true);
    try {
      await joinCommunity(post.community.name);
    } catch {
      setJoined(false);
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

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      setActionError('Could not delete the post.');
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this post from the community?')) return;
    try {
      await removePost(post.id);
      onDeleted?.(post.id);
    } catch {
      setActionError('Could not remove the post.');
    }
  }

  return (
    <article className="post-card">
      <div className="post-header">
        {showCommunity ? (
          <Link
            to={`/r/${post.community.name}`}
            className="post-community"
          >
            <CommunityIcon
              name={post.community.name}
              iconUrl={post.community.iconUrl}
              size={20}
            />
            <span>r/{post.community.name}</span>
          </Link>
        ) : (
          <Link to={`/u/${post.author.username}`} className="post-author">
            u/{post.author.username}
          </Link>
        )}

        <span className="post-dot">•</span>
        <span className="post-time" title={formatFullDate(post.createdAt)}>
          {timeAgo(post.createdAt)}
        </span>
        {post.editedAt && (
          <span className="post-edited" title={`Edited ${formatFullDate(post.editedAt)}`}>
            • edited
          </span>
        )}

        <div className="post-header-spacer" />

        {showCommunity && !joined && (
          <button type="button" className="join-btn" onClick={handleJoin}>
            Join
          </button>
        )}

        {(canEdit || canRemove) && (
          <details className="post-menu" ref={menuRef}>
            <summary aria-label="Post actions">
              <MoreHorizontal size={18} />
            </summary>
            <div className="post-menu-list">
              {canEdit && (
                <Link to={`${postUrl}?edit=1`} onClick={closeMenu}>
                  <Pencil size={14} />
                  Edit
                </Link>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void handleDelete();
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
              {canRemove && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void handleRemove();
                  }}
                >
                  <ShieldX size={14} />
                  Remove
                </button>
              )}
            </div>
          </details>
        )}
      </div>

      <Link to={postUrl} className="post-title">
        {tldr.isTldr && <span className="tldr-tag">TL;DR</span>}
        {tldr.text}
      </Link>

      {post.type === 'LINK' && post.url ? (
        <a
          className="post-link"
          href={post.url}
          target="_blank"
          rel="noreferrer"
        >
          <Link2 size={14} />
          {safeHostname(post.url)}
        </a>
      ) : (
        post.bodyPreview && <p className="post-body">{post.bodyPreview}</p>
      )}

      <div className="post-actions">
        <VotePill score={score} value={myVote} onVote={vote} />

        <Link to={postUrl} className="action-pill" aria-label="Comments">
          <MessageSquare size={18} />
          <span>{formatScore(post.commentCount)}</span>
        </Link>

        <button type="button" className="action-pill" onClick={handleShare}>
          <Share size={18} />
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {(voteError || actionError) && (
        <p className="post-action-error">{voteError ?? actionError}</p>
      )}
    </article>
  );
}
