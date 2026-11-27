import api from './axios';

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PostCommunity {
  id: string;
  name: string;
  iconUrl: string | null;
  creatorId: string;
}

export interface PostDto {
  id: string;
  title: string;
  body: string | null;
  bodyPreview: string | null;
  type: string;
  url: string | null;
  slug: string;
  createdAt: string;
  editedAt: string | null;
  score: number;
  commentCount: number;
  myVote: number;
  status: string;
  author: PostAuthor;
  community: PostCommunity;
  viewerJoined: boolean;
  viewerIsModerator?: boolean;
}

export interface FeedResponse {
  items: PostDto[];
  nextCursor: string | null;
  feed?: string;
}

export interface VoteResult {
  ups: number;
  downs: number;
  score: number;
  myVote: number;
}

export interface CommunityDto {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  creator: PostAuthor;
  memberCount: number;
  postCount: number;
}

export interface CommunityResponse {
  community: CommunityDto;
  viewerJoined: boolean;
  viewerIsModerator: boolean;
}

export interface CommunitySummary {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  memberCount?: number;
  role?: string;
}

export interface FeedParams {
  feed: 'home' | 'popular';
  sort: string;
  t?: string;
  cursor?: string | null;
  limit?: number;
}

export interface SearchPostsResponse {
  items: PostDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function searchPosts(
  q: string,
  page = 1,
  limit = 10
): Promise<SearchPostsResponse> {
  const response = await api.get<SearchPostsResponse>('/posts/search', {
    params: { q, page, limit },
  });
  return response.data;
}

export async function fetchFeed(params: FeedParams): Promise<FeedResponse> {
  const response = await api.get<FeedResponse>('/feed', {
    params: { ...params, cursor: params.cursor ?? undefined },
  });
  return response.data;
}

export async function fetchCommunityPosts(
  name: string,
  params: { sort: string; t?: string; cursor?: string | null; limit?: number }
): Promise<FeedResponse & { community: CommunityDto }> {
  const response = await api.get<FeedResponse & { community: CommunityDto }>(
    `/communities/${encodeURIComponent(name)}/posts`,
    { params: { ...params, cursor: params.cursor ?? undefined } }
  );
  return response.data;
}

export async function fetchPost(id: string): Promise<PostDto> {
  const response = await api.get<{ post: PostDto }>(`/posts/${id}`);
  return response.data.post;
}

export async function votePost(
  id: string,
  value: -1 | 0 | 1
): Promise<VoteResult> {
  const response = await api.put<VoteResult>(`/posts/${id}/vote`, { value });
  return response.data;
}

export async function createPost(
  community: string,
  payload: {
    title: string;
    body?: string | null;
    type?: 'TEXT' | 'LINK' | 'IMAGE';
    url?: string | null;
  }
): Promise<PostDto> {
  const response = await api.post<{ post: PostDto }>(
    `/communities/${encodeURIComponent(community)}/posts`,
    payload
  );
  return response.data.post;
}

export async function updatePost(
  id: string,
  payload: { title?: string; body?: string | null }
): Promise<PostDto> {
  const response = await api.patch<{ post: PostDto }>(`/posts/${id}`, payload);
  return response.data.post;
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/posts/${id}`);
}

export async function removePost(id: string): Promise<void> {
  await api.post(`/posts/${id}/remove`);
}

export async function fetchCommunity(name: string): Promise<CommunityResponse> {
  const response = await api.get<CommunityResponse>(
    `/communities/${encodeURIComponent(name)}`
  );
  return response.data;
}

export async function joinCommunity(name: string): Promise<void> {
  await api.post(`/communities/${encodeURIComponent(name)}/join`);
}

export async function leaveCommunity(name: string): Promise<void> {
  await api.delete(`/communities/${encodeURIComponent(name)}/join`);
}

export async function fetchMyCommunities(): Promise<CommunitySummary[]> {
  const response = await api.get<{ communities: CommunitySummary[] }>(
    '/communities/mine'
  );
  return response.data.communities;
}

export async function fetchCommunities(
  q?: string,
  limit = 20
): Promise<CommunitySummary[]> {
  const response = await api.get<{ communities: CommunitySummary[] }>(
    '/communities',
    { params: { q: q || undefined, limit } }
  );
  return response.data.communities;
}

export async function createCommunity(payload: {
  name: string;
  description?: string | null;
}): Promise<CommunityResponse> {
  const response = await api.post<CommunityResponse>('/communities', payload);
  return response.data;
}
