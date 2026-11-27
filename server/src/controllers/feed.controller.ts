import { Request, Response, NextFunction } from 'express';
import { listPosts } from '../services/post.service.js';
import type { FeedQuery } from '../validations/post.validation.js';

export async function getFeed(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = res.locals.validatedQuery as FeedQuery;
    const viewerId = req.user?.id ?? null;

    // Logged-out home is the popular feed. Logged-in home is joined communities.
    const feed = viewerId ? query.feed : 'popular';

    const result = await listPosts({
      sort: query.sort,
      t: query.t,
      cursor: query.cursor,
      limit: query.limit,
      viewerId,
      homeFor: feed === 'home' ? viewerId : null,
    });

    res.status(200).json({ ...result, feed });
  } catch (error) {
    next(error);
  }
}
