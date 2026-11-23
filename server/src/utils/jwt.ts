import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string; // User ID
  username: string;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  jti: string; // Unique token identifier so consecutive rotations never collide
}

export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not set in environment variables');
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
}

/**
 * Hash high-entropy refresh tokens with SHA-256 before storing in Postgres.
 * Unlike bcrypt (which truncates inputs at 72 bytes), SHA-256 hashes the entire JWT
 * deterministically so we can query the @unique tokenHash column directly.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
