import { Router } from 'express';
import {
  searchUsers,
  getUserProfile,
  getUserPosts,
  updateMyProfile,
} from '../controllers/user.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
} from '../middlewares/validate.middleware.js';
import {
  updateProfileSchema,
  searchUsersQuerySchema,
} from '../validations/auth.validation.js';
import { userPostsQuerySchema } from '../validations/post.validation.js';

const router = Router();

// Static routes MUST be registered before dynamic /:username
router.get('/search', validateQuery(searchUsersQuerySchema), searchUsers);
router.patch('/me', requireAuth, validateBody(updateProfileSchema), updateMyProfile);
router.get(
  '/:username/posts',
  optionalAuth,
  validateQuery(userPostsQuerySchema),
  getUserPosts
);
router.get('/:username', optionalAuth, getUserProfile);

export default router;
