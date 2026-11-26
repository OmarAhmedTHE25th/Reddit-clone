import api from './axios';

export interface SummarizePostPayload {
  title?: string;
  content?: string;
  text?: string;
}

export async function summarizePost(
  payload: SummarizePostPayload
): Promise<string> {
  const res = await api.post<{ summary?: string; error?: string }>(
    '/ai/summarize-post',
    payload
  );

  if (!res.data?.summary) {
    throw new Error(res.data?.error || 'Failed to summarize post');
  }

  return res.data.summary;
}