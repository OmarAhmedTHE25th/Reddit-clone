import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS, } from '../utils/jwt.js';
export const REFRESH_COOKIE_NAME = 'refreshToken';
const PUBLIC_USER_SELECT = {
    id: true,
    username: true,
    email: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
};
function getRefreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/api/auth',
        maxAge: REFRESH_TOKEN_TTL_MS,
    };
}
function getClearCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/api/auth',
    };
}
async function issueSessionTokens(res, user) {
    const accessToken = signAccessToken({
        sub: user.id,
        username: user.username,
    });
    const refreshToken = signRefreshToken(user.id);
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.create({
        data: {
            tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
    });
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    return accessToken;
}
/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
    try {
        const { username, email, password, displayName } = req.body;
        // Check username and email uniqueness (case-insensitive)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
                ],
            },
            select: { username: true, email: true },
        });
        if (existingUser) {
            const isEmailConflict = existingUser.email.toLowerCase() === email.toLowerCase();
            res.status(409).json({
                error: isEmailConflict
                    ? 'Email is already registered'
                    : 'Username is already taken',
                field: isEmailConflict ? 'email' : 'username',
            });
            return;
        }
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                displayName: displayName || username,
            },
            select: PUBLIC_USER_SELECT,
        });
        const accessToken = await issueSessionTokens(res, user);
        res.status(201).json({
            accessToken,
            user,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
    try {
        const { identifier, password } = req.body;
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { username: { equals: identifier, mode: 'insensitive' } },
                ],
            },
        });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const accessToken = await issueSessionTokens(res, user);
        res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/auth/refresh
 * Validates the HttpOnly refresh cookie, detects token reuse/replay,
 * rotates the refresh token in a DB transaction, and returns a fresh access token.
 */
export async function refresh(req, res, next) {
    try {
        const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!incomingToken) {
            res.status(401).json({ error: 'Refresh token missing' });
            return;
        }
        let payload;
        try {
            payload = verifyRefreshToken(incomingToken);
        }
        catch {
            res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }
        const incomingHash = hashRefreshToken(incomingToken);
        const storedToken = await prisma.refreshToken.findUnique({
            where: { tokenHash: incomingHash },
            include: {
                user: {
                    select: PUBLIC_USER_SELECT,
                },
            },
        });
        if (!storedToken) {
            res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
            res.status(401).json({ error: 'Refresh token not recognized' });
            return;
        }
        // Reuse / replay detection: a previously revoked token was presented again
        if (storedToken.revoked) {
            await prisma.refreshToken.updateMany({
                where: { userId: storedToken.userId, revoked: false },
                data: { revoked: true },
            });
            res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
            res.status(401).json({
                error: 'Refresh token reuse detected. All sessions have been revoked.',
            });
            return;
        }
        if (storedToken.expiresAt < new Date() || storedToken.userId !== payload.sub) {
            await prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revoked: true },
            });
            res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
            res.status(401).json({ error: 'Refresh token expired' });
            return;
        }
        // Rotate refresh token atomically: revoke old, insert new
        const newRefreshToken = signRefreshToken(storedToken.user.id);
        const newTokenHash = hashRefreshToken(newRefreshToken);
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revoked: true },
            }),
            prisma.refreshToken.create({
                data: {
                    tokenHash: newTokenHash,
                    userId: storedToken.user.id,
                    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
                },
            }),
        ]);
        const newAccessToken = signAccessToken({
            sub: storedToken.user.id,
            username: storedToken.user.username,
        });
        res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
        res.status(200).json({
            accessToken: newAccessToken,
            user: storedToken.user,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
    try {
        const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (incomingToken) {
            const tokenHash = hashRefreshToken(incomingToken);
            await prisma.refreshToken.updateMany({
                where: { tokenHash, revoked: false },
                data: { revoked: true },
            });
        }
        res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/auth/me
 */
export function getMe(req, res) {
    res.status(200).json({ user: req.user });
}
