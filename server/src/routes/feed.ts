import { Router } from 'express';
import { getFeed } from '../controllers/feed.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import { feedQuerySchema } from '../validations/post.validation.js';

const router = Router();

router.get('/', optionalAuth, validateQuery(feedQuerySchema), getFeed);

export default router;
