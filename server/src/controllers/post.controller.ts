import { Request, Response, NextFunction } from 'express';
import {
  createPost,
  deletePost,
  getPost,
  removePost,
  updatePost,
  applyPostVote,
} from '../services/post.service.js';
import type {
  CreatePostInput,
  UpdatePostInput,
} from '../validations/post.validation.js';

export async function getPostById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const post = await getPost(req.params.id, req.user?.id ?? null);
    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
}

export async function createPostInCommunity(
  req: Request<{ community: string }, unknown, CreatePostInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const post = await createPost(req.params.community, req.user!.id, req.body);
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
}

export async function editPost(
  req: Request<{ id: string }, unknown, UpdatePostInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const post = await updatePost(req.params.id, req.user!.id, req.body);
    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
}

export async function deletePostById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deletePost(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function removePostById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await removePost(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function voteOnPost(
  req: Request<{ id: string }, unknown, { value: -1 | 0 | 1 }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await applyPostVote(
      req.user!.id,
      req.params.id,
      req.body.value
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
