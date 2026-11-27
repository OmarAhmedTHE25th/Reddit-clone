import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { computeHotRank } from '../utils/hot.js';
import { slugify } from '../utils/slug.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import type {
  CommunityPostsQuery,
  CreatePostInput,
  UpdatePostInput,
} from '../validations/post.validation.js';

export type Sort = 'best' | 'hot' | 'new' | 'top';
export type TopWindow = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

const WINDOW_MS: Record<Exclude<TopWindow, 'all'>, number> = {
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
};

const postInclude = {
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  community: {
    select: { id: true, name: true, iconUrl: true, creatorId: true },
  },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;
type HydratedPost = PostWithRelations & { myVote: number };

export interface PostDto {
  id: string;
  title: string;
  body: string | null;
  bodyPreview: string | null;
  type: string;
  url: string | null;
  slug: string;
  createdAt: Date;
  editedAt: Date | null;
  score: number;
  commentCount: number;
  myVote: number;
  status: string;
  author: PostWithRelations['author'];
  community: PostWithRelations['community'];
  viewerJoined: boolean;
  viewerIsModerator?: boolean;
}

export interface ListPostsOptions {
  sort: Sort;
  t: TopWindow;
  cursor?: string;
  limit: number;
  viewerId: string | null;
  communityId?: string;
  homeFor?: string | null;
}

export interface PageResult {
  items: PostDto[];
  nextCursor: string | null;
}

function windowStart(t: TopWindow): Date | null {
  if (t === 'all') return null;
  return new Date(Date.now() - WINDOW_MS[t]);
}

function sortKeyExpression(sort: Sort, viewerId: string | null): Prisma.Sql {
  if (sort === 'new') return Prisma.sql`p."createdAt"`;
  if (sort === 'top') return Prisma.sql`p."score"`;
  if (sort === 'best' && viewerId) {
    return Prisma.sql`(p."hotRank" + CASE WHEN p."communityId" IN (SELECT m."communityId" FROM "CommunityMember" m WHERE m."userId" = ${viewerId}) THEN 0.25::double precision ELSE 0 END)`;
  }
  return Prisma.sql`p."hotRank"`;
}

function toPostDto(post: HydratedPost, viewerJoined: boolean): PostDto {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    bodyPreview: post.body ? post.body.slice(0, 280) : null,
    type: post.type,
    url: post.url,
    slug: post.slug,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    score: post.score,
    commentCount: post.commentCount,
    myVote: post.myVote,
    status: post.status,
    author: post.author,
    community: post.community,
    viewerJoined,
  };
}

async function hydratePosts(
  ids: string[],
  viewerId: string | null
): Promise<HydratedPost[]> {
  const posts = await prisma.post.findMany({
    where: { id: { in: ids } },
    include: postInclude,
  });

  const votes = viewerId
    ? await prisma.postVote.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true, value: true },
      })
    : [];

  const voteMap = new Map(votes.map((vote) => [vote.postId, vote.value]));
  return posts.map((post) => ({
    ...post,
    myVote: voteMap.get(post.id) ?? 0,
  }));
}

export async function listPosts(options: ListPostsOptions): Promise<PageResult> {
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;
  if (options.cursor && !cursor) {
    throw new HttpError(400, 'Invalid cursor');
  }
  if (cursor && (cursor.sort !== options.sort || cursor.t !== options.t)) {
    throw new HttpError(400, 'Cursor does not match this feed');
  }

  const key = sortKeyExpression(options.sort, options.viewerId);
  const t0 =
    options.sort === 'top'
      ? cursor?.t0
        ? new Date(cursor.t0)
        : windowStart(options.t)
      : null;

  const scope = options.communityId
    ? Prisma.sql`AND p."communityId" = ${options.communityId}`
    : options.homeFor
      ? Prisma.sql`AND p."communityId" IN (SELECT m."communityId" FROM "CommunityMember" m WHERE m."userId" = ${options.homeFor})`
      : Prisma.empty;

  const window =
    options.sort === 'top' && t0
      ? Prisma.sql`AND p."createdAt" >= ${t0}`
      : Prisma.empty;

  const anchorCte = cursor
    ? Prisma.sql`WITH anchor AS (SELECT ${key} AS k FROM "Post" p WHERE p.id = ${cursor.id})`
    : Prisma.empty;
  const anchorFrom = cursor ? Prisma.sql`, anchor` : Prisma.empty;
  const after = cursor
    ? Prisma.sql`AND (${key}, p.id) < (anchor.k, ${cursor.id})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      ${anchorCte}
      SELECT p.id
      FROM "Post" p
      ${anchorFrom}
      WHERE p.status = 'ACTIVE'::"PostStatus"
        ${scope}
        ${window}
        ${after}
      ORDER BY ${key} DESC, p.id DESC
      LIMIT ${options.limit + 1}
    `
  );

  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;
  const ids = page.map((row) => row.id);

  const hydrated = ids.length
    ? await hydratePosts(ids, options.viewerId)
    : [];
  const byId = new Map(hydrated.map((post) => [post.id, post]));

  const communityIds = [...new Set(hydrated.map((post) => post.communityId))];
  const memberships =
    options.viewerId && communityIds.length
      ? await prisma.communityMember.findMany({
          where: {
            userId: options.viewerId,
            communityId: { in: communityIds },
          },
          select: { communityId: true },
        })
      : [];
  const joined = new Set(memberships.map((m) => m.communityId));

  const items = ids
    .map((id) => byId.get(id))
    .filter((post): post is HydratedPost => Boolean(post))
    .map((post) => toPostDto(post, joined.has(post.communityId)));

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          v: 1,
          sort: options.sort,
          t: options.t,
          id: last.id,
          ...(t0 ? { t0: t0.toISOString() } : {}),
        })
      : null;

  return { items, nextCursor };
}

export async function getPost(
  postId: string,
  viewerId: string | null
): Promise<PostDto> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude,
  });
  if (!post) throw new HttpError(404, 'Post not found');

  const [vote, membership] = await Promise.all([
    viewerId
      ? prisma.postVote.findUnique({
          where: { userId_postId: { userId: viewerId, postId } },
          select: { value: true },
        })
      : null,
    viewerId
      ? prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId: viewerId,
              communityId: post.communityId,
            },
          },
          select: { role: true },
        })
      : null,
  ]);

  const viewerIsModerator = Boolean(
    viewerId &&
      (post.community.creatorId === viewerId || membership?.role === 'MODERATOR')
  );

  return {
    ...toPostDto({ ...post, myVote: vote?.value ?? 0 }, Boolean(membership)),
    viewerIsModerator,
  };
}

export async function createPost(
  communityName: string,
  authorId: string,
  input: CreatePostInput
): Promise<PostDto> {
  const community = await prisma.community.findFirst({
    where: { name: { equals: communityName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!community) throw new HttpError(404, 'Community not found');

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        communityId: community.id,
        authorId,
        title: input.title,
        body: input.body ?? null,
        type: input.type,
        url: input.url ?? null,
        slug: slugify(input.title),
      },
    });

    // Reddit auto-upvotes your own post. Store it as a real vote row so
    // score === SUM(votes.value) always holds.
    await tx.postVote.create({
      data: { userId: authorId, postId: post.id, value: 1 },
    });

    return tx.post.update({
      where: { id: post.id },
      data: {
        ups: 1,
        downs: 0,
        score: 1,
        hotRank: computeHotRank(1, post.createdAt),
      },
    });
  });

  return getPost(created.id, authorId);
}

export async function updatePost(
  postId: string,
  userId: string,
  input: UpdatePostInput
): Promise<PostDto> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, status: true, title: true, body: true },
  });
  if (!post) throw new HttpError(404, 'Post not found');
  if (post.authorId !== userId) {
    throw new HttpError(403, 'You can only edit your own posts');
  }
  if (post.status !== 'ACTIVE') {
    throw new HttpError(409, 'This post can no longer be edited');
  }

  const data: Prisma.PostUpdateInput = {};
  if (input.title !== undefined && input.title !== post.title) {
    data.title = input.title;
  }
  if (input.body !== undefined && (input.body ?? null) !== post.body) {
    data.body = input.body ?? null;
  }

  if (Object.keys(data).length === 0) return getPost(postId, userId);

  data.editedAt = new Date();
  await prisma.post.update({ where: { id: postId }, data });
  return getPost(postId, userId);
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new HttpError(404, 'Post not found');
  if (post.authorId !== userId) {
    throw new HttpError(403, 'You can only delete your own posts');
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: 'DELETED' },
  });
}

export async function removePost(postId: string, userId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      communityId: true,
      community: { select: { creatorId: true } },
    },
  });
  if (!post) throw new HttpError(404, 'Post not found');

  const membership = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId, communityId: post.communityId },
    },
    select: { role: true },
  });

  const isModerator =
    post.community.creatorId === userId || membership?.role === 'MODERATOR';
  if (!isModerator) {
    throw new HttpError(403, 'Only community moderators can remove posts');
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: 'REMOVED' },
  });
}

export interface VoteResult {
  ups: number;
  downs: number;
  score: number;
  myVote: number;
}

/**
 * One transaction per vote:
 * 1. Lock the post row (validates existence/status and serializes votes on it).
 * 2. Lock/read the voter's row to get the old value.
 * 3. Upsert the new value.
 * 4. Apply relative deltas and recompute hotRank from the NEW score.
 *
 * Relative deltas + row locking are what keep counters correct when many
 * votes land at once. Never compute the new score in application code.
 */
export async function applyPostVote(
  userId: string,
  postId: string,
  newValue: -1 | 0 | 1
): Promise<VoteResult> {
  return prisma.$transaction(async (tx) => {
    const posts = await tx.$queryRaw<
      Array<{ id: string; status: string; ups: number; downs: number; score: number }>
    >`
      SELECT id, status, ups, downs, score
      FROM "Post"
      WHERE id = ${postId}
      FOR UPDATE
    `;

    const post = posts[0];
    if (!post) throw new HttpError(404, 'Post not found');
    if (post.status !== 'ACTIVE') {
      throw new HttpError(409, 'You cannot vote on this post');
    }

    const existing = await tx.$queryRaw<Array<{ value: number }>>`
      SELECT value
      FROM "PostVote"
      WHERE "userId" = ${userId} AND "postId" = ${postId}
      FOR UPDATE
    `;
    const oldValue = existing[0]?.value ?? 0;

    if (oldValue === newValue) {
      return {
        ups: post.ups,
        downs: post.downs,
        score: post.score,
        myVote: newValue,
      };
    }

    await tx.$executeRaw`
      INSERT INTO "PostVote" ("userId", "postId", "value")
      VALUES (${userId}, ${postId}, ${newValue})
      ON CONFLICT ("userId", "postId") DO UPDATE SET value = EXCLUDED.value
    `;

    const dUp = (newValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
    const dDown = (newValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);
    const dScore = newValue - oldValue;

    const updated = await tx.$queryRaw<
      Array<{ ups: number; downs: number; score: number }>
    >`
      UPDATE "Post"
      SET ups = ups + ${dUp},
          downs = downs + ${dDown},
          score = score + ${dScore},
          "hotRank" = sign((score + ${dScore})::double precision)
                    * log(greatest(abs(score + ${dScore}), 1)::double precision)
                    + ((extract(epoch FROM "createdAt") - 1134028003) / 45000.0)::double precision
      WHERE id = ${postId}
      RETURNING ups, downs, score
    `;

    return { ...updated[0], myVote: newValue };
  });
}

export interface CommunityDto {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  createdAt: Date;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  memberCount: number;
  postCount: number;
}

export async function getCommunity(
  name: string,
  viewerId: string | null
): Promise<{
  community: CommunityDto;
  viewerJoined: boolean;
  viewerIsModerator: boolean;
}> {
  const community = await prisma.community.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    include: {
      creator: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: {
        select: { members: true, posts: { where: { status: 'ACTIVE' } } },
      },
    },
  });
  if (!community) throw new HttpError(404, 'Community not found');

  const membership = viewerId
    ? await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: viewerId, communityId: community.id },
        },
        select: { role: true },
      })
    : null;

  return {
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      iconUrl: community.iconUrl,
      bannerUrl: community.bannerUrl,
      createdAt: community.createdAt,
      creator: community.creator,
      memberCount: community._count.members,
      postCount: community._count.posts,
    },
    viewerJoined: Boolean(membership),
    viewerIsModerator: Boolean(
      viewerId &&
        (community.creatorId === viewerId || membership?.role === 'MODERATOR')
    ),
  };
}

export async function listCommunities(
  query: string | undefined,
  limit: number
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    memberCount: number;
  }>
> {
  const communities = await prisma.community.findMany({
    where: query
      ? { name: { contains: query, mode: 'insensitive' } }
      : undefined,
    orderBy: [{ members: { _count: 'desc' } }, { name: 'asc' }],
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      iconUrl: true,
      _count: { select: { members: true } },
    },
  });

  return communities.map((community) => ({
    id: community.id,
    name: community.name,
    description: community.description,
    iconUrl: community.iconUrl,
    memberCount: community._count.members,
  }));
}

export async function getMyCommunities(userId: string) {
  const memberships = await prisma.communityMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    select: {
      role: true,
      community: { select: { id: true, name: true, iconUrl: true } },
    },
  });

  return memberships.map((membership) => ({
    ...membership.community,
    role: membership.role,
  }));
}

export async function joinCommunity(
  name: string,
  userId: string
): Promise<void> {
  const community = await prisma.community.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!community) throw new HttpError(404, 'Community not found');

  await prisma.communityMember.upsert({
    where: {
      userId_communityId: { userId, communityId: community.id },
    },
    update: {},
    create: { userId, communityId: community.id, role: 'MEMBER' },
  });
}

export async function leaveCommunity(
  name: string,
  userId: string
): Promise<void> {
  const community = await prisma.community.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!community) throw new HttpError(404, 'Community not found');

  await prisma.communityMember.deleteMany({
    where: { userId, communityId: community.id },
  });
}

export async function createCommunity(
  name: string,
  description: string | null | undefined,
  creatorId: string
) {
  const existing = await prisma.community.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, 'That community name is already taken');
  }

  const community = await prisma.$transaction(async (tx) => {
    const created = await tx.community.create({
      data: {
        name,
        description: description ?? null,
        creatorId,
      },
    });
    await tx.communityMember.create({
      data: {
        userId: creatorId,
        communityId: created.id,
        role: 'MODERATOR',
      },
    });
    return created;
  });

  return getCommunity(community.name, creatorId);
}

export type { CommunityPostsQuery };
