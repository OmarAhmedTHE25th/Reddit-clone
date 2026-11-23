import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { verifyAccessToken } from '../utils/jwt.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

// Augment Express Request globally so teammates get typed `req.user` automatically
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Strictly requires a valid Bearer JWT access token.
 * Attaches the verified user record to `req.user` or responds with 401 Unauthorized.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User account no longer exists' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

/**
 * Optionally authenticates the request if a valid Bearer token is present.
 * Never blocks the request: if missing or invalid, `req.user` remains undefined.
 * Useful for public routes (posts, profiles, communities) that tailor UI for logged-in users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid/expired token on optional routes
  }

  next();
}
