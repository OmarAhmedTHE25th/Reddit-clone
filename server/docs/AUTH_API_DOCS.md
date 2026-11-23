# Auth & User Identity API Documentation

Base URL (local): `http://localhost:5000`
OpenAPI 3.0 Spec: [`server/docs/openapi.json`](./openapi.json)

---

## Authentication Architecture

- **Access Token (JWT, 15m):** Returned in JSON (`accessToken`) and sent by clients in the `Authorization: Bearer <token>` header. Stored **only in React memory** (never `localStorage`) to protect against XSS token theft.
- **Refresh Token (JWT, 7d):** Stored in an `HttpOnly`, `SameSite=Lax` (`SameSite=None; Secure` in production) cookie scoped to `/api/auth`, with its SHA-256 hash stored in PostgreSQL (`RefreshToken` table).
- **Token Rotation & Replay Protection:** Every `POST /api/auth/refresh` revokes the used refresh token and issues a fresh pair atomically. If a previously revoked token is replayed, **all** active sessions for that user are revoked.

---

## Teammate Middleware Guide

Import from `server/src/middlewares/auth.middleware.js`:

```ts
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';

// Protected route (returns 401 if unauthenticated)
router.post('/posts', requireAuth, (req, res) => {
  const userId = req.user!.id; // Guaranteed non-null
});

// Public route with optional user context
router.get('/posts/:id', optionalAuth, (req, res) => {
  const viewerId = req.user?.id; // Undefined if logged out
});
```

---

## Endpoints (Postman / cURL Ready)

### 1. Register — `POST /api/auth/register`
**Request Body:**
```json
{
  "username": "alice_dev",
  "email": "alice@example.com",
  "password": "Password123",
  "displayName": "Alice"
}
```
**Response (`201 Created`):** Sets `Set-Cookie: refreshToken=...; HttpOnly; Path=/api/auth`
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "username": "alice_dev",
    "email": "alice@example.com",
    "displayName": "Alice",
    "bio": null,
    "avatarUrl": null,
    "createdAt": "2026-11-23T19:00:00.000Z",
    "updatedAt": "2026-11-23T19:00:00.000Z"
  }
}
```

### 2. Login — `POST /api/auth/login`
**Request Body:** (`identifier` accepts either email or username)
```json
{
  "identifier": "alice_dev",
  "password": "Password123"
}
```
**Response (`200 OK`):** Same shape as Register + sets `refreshToken` cookie.

### 3. Refresh Session — `POST /api/auth/refresh`
**Headers/Cookies:** Automatically sends `refreshToken` cookie (`withCredentials: true`).
**Response (`200 OK`):** Returns new `accessToken` + `user` and rotates the `refreshToken` cookie.

### 4. Logout — `POST /api/auth/logout`
**Response (`200 OK`):** Revokes token in DB and clears `refreshToken` cookie.
```json
{ "message": "Logged out successfully" }
```

### 5. Current User — `GET /api/auth/me`
**Headers:** `Authorization: Bearer <accessToken>`
**Response (`200 OK`):** `{ "user": { ... } }`

### 6. Public Profile — `GET /api/users/:username`
**Headers (optional):** `Authorization: Bearer <accessToken>`
**Response (`200 OK`):**
```json
{
  "user": {
    "id": "uuid",
    "username": "alice_dev",
    "displayName": "Alice",
    "bio": "Building full-stack apps.",
    "avatarUrl": null,
    "createdAt": "2026-11-23T19:00:00.000Z",
    "counts": { "posts": 0, "comments": 0 },
    "joinedCommunities": [],
    "isOwnProfile": true
  }
}
```

### 7. Update My Profile — `PATCH /api/users/me`
**Headers:** `Authorization: Bearer <accessToken>`
**Request Body:**
```json
{
  "displayName": "Alice Smith",
  "bio": "Full-stack developer & Reddit enthusiast",
  "avatarUrl": "https://api.dicebear.com/9.x/thumbs/svg?seed=alice"
}
```
**Response (`200 OK`):** `{ "user": { ... } }`

### 8. Search Users — `GET /api/users/search?q=alice&page=1&limit=10`
**Response (`200 OK`):**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "alice_dev",
      "displayName": "Alice Smith",
      "bio": "Full-stack developer & Reddit enthusiast",
      "avatarUrl": null,
      "createdAt": "2026-11-23T19:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```
