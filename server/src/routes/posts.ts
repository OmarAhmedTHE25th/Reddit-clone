import { Router } from 'express';
import {
  deletePostById,
  editPost,
  getPostById,
  removePostById,
  searchPostsByQuery,
  voteOnPost,
} from '../controllers/post.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
  searchPostsQuerySchema,
  updatePostSchema,
  voteSchema,
} from '../validations/post.validation.js';

const router = Router();

router.get(
  '/search',
  optionalAuth,
  validateQuery(searchPostsQuerySchema),
  searchPostsByQuery
);
router.get('/:id', optionalAuth, getPostById);
router.patch('/:id', requireAuth, validateBody(updatePostSchema), editPost);
router.delete('/:id', requireAuth, deletePostById);
router.post('/:id/remove', requireAuth, removePostById);
router.put('/:id/vote', requireAuth, validateBody(voteSchema), voteOnPost);

export default router;
