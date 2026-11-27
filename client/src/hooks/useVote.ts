import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPost, votePost } from '../api/posts';

interface Votable {
  id: string;
  score: number;
  myVote: number;
}

export function useVote(
  post: Votable,
  onChange?: (score: number, myVote: number) => void
) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [score, setScore] = useState(post.score);
  const [myVote, setMyVote] = useState(post.myVote);
  const [error, setError] = useState<string | null>(null);

  const targetRef = useRef(post.myVote);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!runningRef.current) {
      setScore(post.score);
      setMyVote(post.myVote);
      targetRef.current = post.myVote;
    }
  }, [post.id, post.score, post.myVote]);

  async function flush() {
    runningRef.current = true;
    setError(null);

    try {
      while (true) {
        const target = targetRef.current;
        const result = await votePost(post.id, target as -1 | 0 | 1);

        if (targetRef.current === target) {
          setScore(result.score);
          setMyVote(result.myVote);
          onChange?.(result.score, result.myVote);
          break;
        }
      }
    } catch {
      setError('Vote failed. Please try again.');
      try {
        const fresh = await fetchPost(post.id);
        setScore(fresh.score);
        setMyVote(fresh.myVote);
        targetRef.current = fresh.myVote;
        onChange?.(fresh.score, fresh.myVote);
      } catch {
        // The next render will show the last known state.
      }
    } finally {
      runningRef.current = false;
    }
  }

  function vote(next: -1 | 0 | 1) {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const delta = next - targetRef.current;
    targetRef.current = next;
    setMyVote(next);
    setScore((current) => current + delta);

    if (!runningRef.current) {
      void flush();
    }
  }

  return { score, myVote, vote, error };
}
