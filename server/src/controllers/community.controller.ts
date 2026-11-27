import { Request, Response, NextFunction } from 'express';
import {
  createCommunity,
  getCommunity,
  getMyCommunities,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listPosts,
} from '../services/post.service.js';
import type {
  CommunityPostsQuery,
  CreateCommunityInput,
  ListCommunitiesQuery,
} from '../validations/post.validation.js';

export async function listCommunityPosts(
  req: Request<{ name: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = res.locals.validatedQuery as CommunityPostsQuery;
    const { community } = await getCommunity(
      req.params.name,
      req.user?.id ?? null
    );

    const result = await listPosts({
      sort: query.sort,
      t: query.t,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: req.user?.id ?? null,
      communityId: community.id,
    });

    res.status(200).json({ ...result, community });
  } catch (error) {
    next(error);
  }
}

export async function getCommunityByName(
  req: Request<{ name: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getCommunity(req.params.name, req.user?.id ?? null);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAllCommunities(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = res.locals.validatedQuery as ListCommunitiesQuery;
    const communities = await listCommunities(query.q, query.limit);
    res.status(200).json({ communities });
  } catch (error) {
    next(error);
  }
}

export async function listMyCommunities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const communities = await getMyCommunities(req.user!.id);
    res.status(200).json({ communities });
  } catch (error) {
    next(error);
  }
}

export async function createNewCommunity(
  req: Request<unknown, unknown, CreateCommunityInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await createCommunity(
      req.body.name,
      req.body.description,
      req.user!.id
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function joinCommunityByName(
  req: Request<{ name: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await joinCommunity(req.params.name, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function leaveCommunityByName(
  req: Request<{ name: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await leaveCommunity(req.params.name, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
