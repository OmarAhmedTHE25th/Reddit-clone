import prisma from '../config/db.js';
/**
 * GET /api/users/search?q=...&page=1&limit=10
 * Case-insensitive search on username and displayName with pagination.
 */
export async function searchUsers(_req, res, next) {
    try {
        const { q, page, limit } = res.locals.validatedQuery;
        const skip = (page - 1) * limit;
        const where = {
            OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
            ],
        };
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    bio: true,
                    avatarUrl: true,
                    createdAt: true,
                },
                orderBy: { username: 'asc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        res.status(200).json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/users/:username
 * Public user profile lookup. Optionally tailored when caller is authenticated.
 */
export async function getUserProfile(req, res, next) {
    try {
        const { username } = req.params;
        const user = await prisma.user.findFirst({
            where: {
                username: { equals: username, mode: 'insensitive' },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: `User u/${username} not found` });
            return;
        }
        // Teammate integration note:
        // Once Post, Comment, and CommunityMember models are added to schema.prisma,
        // include `_count: { select: { posts: true, comments: true } }` and `memberships`
        // in the query above and populate `counts` and `joinedCommunities` below.
        res.status(200).json({
            user: {
                ...user,
                counts: {
                    posts: 0,
                    comments: 0,
                },
                joinedCommunities: [],
                isOwnProfile: req.user?.id === user.id,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /api/users/me
 * Authenticated update of the current user's profile fields.
 */
export async function updateMyProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const { displayName, bio, avatarUrl } = req.body;
        const updateData = {};
        if (displayName !== undefined) {
            updateData.displayName = displayName === '' ? null : displayName;
        }
        if (bio !== undefined) {
            updateData.bio = bio === '' ? null : bio;
        }
        if (avatarUrl !== undefined) {
            updateData.avatarUrl = avatarUrl === '' ? null : avatarUrl;
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.status(200).json({ user: updatedUser });
    }
    catch (error) {
        next(error);
    }
}
