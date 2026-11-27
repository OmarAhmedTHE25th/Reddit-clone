import { Router } from 'express';
import {
  createNewCommunity,
  getCommunityByName,
  joinCommunityByName,
  leaveCommunityByName,
  listAllCommunities,
  listCommunityPosts,
  listMyCommunities,
} from '../controllers/community.controller.js';
import { createPostInCommunity } from '../controllers/post.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
} from '../middlewares/validate.middleware.js';
import {
  communityPostsQuerySchema,
  createCommunitySchema,
  createPostSchema,
  listCommunitiesQuerySchema,
} from '../validations/post.validation.js';

const router = Router();

// Static routes before /:name
router.get(
  '/',
  validateQuery(listCommunitiesQuerySchema),
  listAllCommunities
);
router.get('/mine', requireAuth, listMyCommunities);
router.post(
  '/',
  requireAuth,
  validateBody(createCommunitySchema),
  createNewCommunity
);

router.get('/:name', optionalAuth, getCommunityByName);
router.get(
  '/:name/posts',
  optionalAuth,
  validateQuery(communityPostsQuerySchema),
  listCommunityPosts
);
router.post(
  '/:name/posts',
  requireAuth,
  validateBody(createPostSchema),
  createPostInCommunity
);
router.post('/:name/join', requireAuth, joinCommunityByName);
router.delete('/:name/join', requireAuth, leaveCommunityByName);

export default router;
