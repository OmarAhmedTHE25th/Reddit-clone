import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { formatScore } from '../../utils/format';

interface Props {
  score: number;
  value: number;
  onVote: (next: -1 | 0 | 1) => void;
  small?: boolean;
}

export default function VotePill({ score, value, onVote, small }: Props) {
  const upvoted = value === 1;
  const downvoted = value === -1;

  return (
    <div
      className={`vote-pill${upvoted ? ' upvoted' : ''}${
        downvoted ? ' downvoted' : ''
      }${small ? ' small' : ''}`}
    >
      <button
        type="button"
        className="vote-arrow"
        aria-label={upvoted ? 'Remove upvote' : 'Upvote'}
        aria-pressed={upvoted}
        onClick={() => onVote(upvoted ? 0 : 1)}
      >
        <ArrowBigUp
          size={small ? 16 : 20}
          fill={upvoted ? 'currentColor' : 'none'}
        />
      </button>

      <span className="vote-score" aria-live="polite">
        {formatScore(score)}
      </span>

      <button
        type="button"
        className="vote-arrow"
        aria-label={downvoted ? 'Remove downvote' : 'Downvote'}
        aria-pressed={downvoted}
        onClick={() => onVote(downvoted ? 0 : -1)}
      >
        <ArrowBigDown
          size={small ? 16 : 20}
          fill={downvoted ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  );
}
