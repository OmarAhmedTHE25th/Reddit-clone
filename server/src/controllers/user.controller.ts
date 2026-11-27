import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { listPosts } from '../services/post.service.js';
import type {
  UpdateProfileInput,
  SearchUsersQuery,
} from '../validations/auth.validation.js';
import type { UserPostsQuery } from '../validations/post.validation.js';

/**
 * GET /api/users/search?q=...&page=1&limit=10
 * Case-insensitive search on username and displayName with pagination.
 */
export async function searchUsers(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, page, limit } = res.locals.validatedQuery as SearchUsersQuery;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { username: { contains: q, mode: 'insensitive' as const } },
        { displayName: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: { username: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:username
 * Public user profile lookup. Optionally tailored when caller is authenticated.
 */
export async function getUserProfile(
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            posts: { where: { status: 'ACTIVE' } },
            comments: { where: { status: 'ACTIVE' } },
          },
        },
        memberships: {
          orderBy: { joinedAt: 'desc' },
          select: {
            community: { select: { id: true, name: true, iconUrl: true } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: `User u/${username} not found` });
      return;
    }

    const { _count, memberships, ...profile } = user;

    res.status(200).json({
      user: {
        ...profile,
        counts: {
          posts: _count.posts,
          comments: _count.comments,
        },
        joinedCommunities: memberships.map((membership) => membership.community),
        isOwnProfile: req.user?.id === user.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:username/posts
 * Cursor-paginated posts authored by one user.
 */
export async function getUserPosts(
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username } = req.params;
    const query = res.locals.validatedQuery as UserPostsQuery;

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!user) {
      res.status(404).json({ error: `User u/${username} not found` });
      return;
    }

    const result = await listPosts({
      sort: query.sort,
      t: query.t,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: req.user?.id ?? null,
      authorId: user.id,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/me
 * Authenticated update of the current user's profile fields.
 */
export async function updateMyProfile(
  req: Request<unknown, unknown, UpdateProfileInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { displayName, bio, avatarUrl } = req.body;

    const updateData: {
      displayName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    } = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName === '' ? null : displayName;
    }
    if (bio !== undefined) {
      updateData.bio = bio === '' ? null : bio;
    }
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl === '' ? null : avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
}
