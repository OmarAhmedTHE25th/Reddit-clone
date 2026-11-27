import { Router } from 'express';
import {
  deletePostById,
  editPost,
  getPostById,
  removePostById,
  voteOnPost,
} from '../controllers/post.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  updatePostSchema,
  voteSchema,
} from '../validations/post.validation.js';

const router = Router();

router.get('/:id', optionalAuth, getPostById);
router.patch('/:id', requireAuth, validateBody(updatePostSchema), editPost);
router.delete('/:id', requireAuth, deletePostById);
router.post('/:id/remove', requireAuth, removePostById);
router.put('/:id/vote', requireAuth, validateBody(voteSchema), voteOnPost);

export default router;
