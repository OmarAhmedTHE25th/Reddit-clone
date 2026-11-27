import { z } from 'zod';

export const POST_SORTS = ['best', 'hot', 'new', 'top'] as const;
export const TOP_WINDOWS = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;

export const createPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(300, 'Title must be at most 300 characters'),
    body: z
      .string()
      .trim()
      .max(40000, 'Post body is too long')
      .optional()
      .nullable(),
    type: z.enum(['TEXT', 'LINK', 'IMAGE']).default('TEXT'),
    url: z
      .string()
      .trim()
      .url('Please provide a valid URL')
      .max(2048, 'URL is too long')
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if ((data.type === 'LINK' || data.type === 'IMAGE') && !data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'A URL is required for link and image posts',
      });
    }
  });

export const updatePostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(300, 'Title must be at most 300 characters')
      .optional(),
    body: z
      .string()
      .trim()
      .max(40000, 'Post body is too long')
      .nullable()
      .optional(),
  })
  .refine((data) => data.title !== undefined || data.body !== undefined, {
    message: 'Provide a title or body to update',
  });

export const voteSchema = z.object({
  value: z
    .number()
    .int()
    .refine((value) => value === -1 || value === 0 || value === 1, {
      message: 'value must be -1, 0, or 1',
    }),
});

export const feedQuerySchema = z.object({
  feed: z.enum(['home', 'popular']).default('home'),
  sort: z.enum(POST_SORTS).default('best'),
  t: z.enum(TOP_WINDOWS).default('day'),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const communityPostsQuerySchema = z.object({
  sort: z.enum(POST_SORTS).default('hot'),
  t: z.enum(TOP_WINDOWS).default('day'),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Community name must be at least 3 characters')
    .max(21, 'Community name must be at most 21 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Community names can only contain letters, numbers, and underscores'
    ),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
});

export const listCommunitiesQuerySchema = z.object({
  q: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type CommunityPostsQuery = z.infer<typeof communityPostsQuerySchema>;
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesQuerySchema>;
