import { z } from 'zod';
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export const registerSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens'),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Please provide a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be at most 72 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    displayName: z
        .string()
        .trim()
        .min(1, 'Display name cannot be empty')
        .max(50, 'Display name must be at most 50 characters')
        .optional(),
});
export const loginSchema = z.object({
    // Accepts either email or username
    identifier: z
        .string()
        .trim()
        .min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
});
export const updateProfileSchema = z
    .object({
    displayName: z
        .string()
        .trim()
        .max(50, 'Display name must be at most 50 characters')
        .nullable()
        .optional(),
    bio: z
        .string()
        .trim()
        .max(300, 'Bio must be at most 300 characters')
        .nullable()
        .optional(),
    avatarUrl: z
        .string()
        .trim()
        .url('Avatar URL must be a valid URL')
        .max(500, 'Avatar URL is too long')
        .or(z.literal(''))
        .nullable()
        .optional(),
})
    .refine((data) => data.displayName !== undefined ||
    data.bio !== undefined ||
    data.avatarUrl !== undefined, { message: 'Provide at least one field to update (displayName, bio, or avatarUrl)' });
export const searchUsersQuerySchema = z.object({
    q: z.string().trim().min(1, 'Search query "q" is required').max(50),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});
