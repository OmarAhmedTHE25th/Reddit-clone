import { useState } from 'react';
import { summarizePost } from '../api/ai';

interface PostSummarizerProps {
  title?: string;
  content?: string;
}

export function PostSummarizer({ title = '', content = '' }: PostSummarizerProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSummarize = async () => {
    setError('');
    setSummary('');
    setLoading(true);

    try {
      const result = await summarizePost({ title, content });
      setSummary(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <button
        type="button"
        onClick={handleSummarize}
        disabled={loading}
        style={{
          padding: '6px 12px',
          borderRadius: '999px',
          border: '1px solid #d3d6da',
          backgroundColor: '#f6f7f8',
          color: '#1a1a1b',
          fontWeight: 600,
          fontSize: '13px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Summarizing...' : '✨ Summarize Post'}
      </button>

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#fdecec',
            color: '#9b1c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {summary && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e2e5e9',
            backgroundColor: '#f8fafc',
            color: '#111827',
            fontSize: '14px',
            lineHeight: 1.5,
            whiteSpace: 'pre-line',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>AI Summary</div>
          <div>{summary}</div>
        </div>
      )}
    </div>
  );
}