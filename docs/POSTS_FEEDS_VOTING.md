# Posts, Feeds, Sorting, Voting & Communities

This document explains the post engine of the Reddit clone end to end: the database model, the REST API, the concurrent voting system, feed ranking and cursor pagination, communities and moderation, search, the seed data, and the React UI that consumes all of it. It is self-contained and assumes no other document.

**Contents**

1. [Quick start](#1-quick-start)
2. [Architecture](#2-architecture)
3. [Data model](#3-data-model)
4. [Post lifecycle](#4-post-lifecycle)
5. [Concurrent voting system](#5-concurrent-voting-system)
6. [Feeds, sorting, and pagination](#6-feeds-sorting-and-pagination)
7. [Communities](#7-communities)
8. [Search](#8-search)
9. [API reference](#9-api-reference)
10. [Frontend](#10-frontend)
11. [Seed data and maintenance](#11-seed-data-and-maintenance)
12. [Operational notes and limitations](#12-operational-notes-and-limitations)
13. [Verification checklist](#13-verification-checklist)

---

## 1. Quick start

### Requirements

- Node.js 20+
- PostgreSQL 16 (local, Docker, or Neon)
- npm 10+

### Environment

The API reads `server/.env`. A root `.env` is **not** loaded by the server scripts, because `dotenv` resolves relative to the process working directory.

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
PORT=5000
CLIENT_URL="http://localhost:5173"
GEMINI_API_KEY="..."          # optional, only for the AI summarizer
```

`DATABASE_URL` is used by Prisma at runtime (it may point at a pooler). `DIRECT_URL` is used by migrations and should point directly at the database.

### Install, migrate, seed, run

```bash
npm run install:all
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
npm run dev
```

- API: `http://localhost:5000/api`
- Client: `http://localhost:5173` (Vite proxies `/api` to port 5000)
- Demo account: `demo` / `password123`

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs server and client together with `concurrently` |
| `npm run dev:server` | Express API with `tsx watch` |
| `npm run dev:client` | Vite dev server |
| `npm run build` | Type-checks and builds both packages |
| `npm --prefix server run prisma:migrate` | Applies migrations and regenerates Prisma Client |
| `npm --prefix server run prisma:seed` | Seeds users, communities, posts, votes, and comments |
| `npm --prefix server run db:reconcile` | Verifies every post counter matches its vote rows |
| `npm --prefix server run vote:race` | Runs the concurrent voting test and checks invariants |

---

## 2. Architecture

```
HTTP request
  └─ Express route            server/src/routes/*
       ├─ auth middleware     requireAuth / optionalAuth
       ├─ Zod validation      validateBody / validateQuery
       ├─ controller          parses req/res, calls the service
       └─ service             business rules + Prisma / raw SQL
            └─ PostgreSQL
```

- **Routes** own the URL surface and middleware order.
- **Controllers** stay thin. They read `res.locals.validatedQuery` or `req.body`, call one service function, and map the result to JSON.
- **Services** own all invariants. The vote transaction, counter updates, membership checks, and cursor logic live here.
- **Validation** uses Zod. Parsed bodies replace `req.body`; parsed queries are stored in `res.locals.validatedQuery`.
- **Errors** are thrown as `HttpError(status, message)`. The global error handler returns `{ error }` for statuses below 500 and a generic 500 otherwise.

Key files:

| File | Responsibility |
| --- | --- |
| `server/prisma/schema.prisma` | All models, enums, indexes, and relations |
| `server/prisma/migrations/*` | Schema + invariant migrations |
| `server/src/services/post.service.ts` | Posts, votes, feeds, communities, search |
| `server/src/controllers/*` | HTTP mapping for feed, posts, communities |
| `server/src/routes/*` | URL definitions and middleware chains |
| `server/src/validations/post.validation.ts` | Zod schemas for posts, votes, feeds, search, communities |
| `server/src/utils/hot.ts` | Hot rank formula |
| `server/src/utils/cursor.ts` | Cursor encode/decode |
| `server/src/utils/slug.ts` | Post slug generation |
| `server/src/utils/httpError.ts` | Typed HTTP errors |
| `server/prisma/seed.ts` | Demo data |
| `server/prisma/reconcile.ts` | Counter integrity check |
| `server/scripts/vote-race.ts` | Concurrency test |

---

## 3. Data model

### Enums

| Enum | Values | Meaning |
| --- | --- | --- |
| `PostStatus` | `ACTIVE`, `DELETED`, `REMOVED` | Visible, deleted by author, removed by moderator |
| `PostType` | `TEXT`, `LINK`, `IMAGE` | Post content kind |
| `CommunityRole` | `MEMBER`, `MODERATOR` | Membership level |

### `Post`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `communityId` | UUID | FK to `Community`, cascade delete |
| `authorId` | UUID | FK to `User` |
| `title` | text | 1–300 characters |
| `body` | text? | Up to 40,000 characters |
| `type` | `PostType` | Default `TEXT` |
| `url` | text? | Required for `LINK` / `IMAGE` |
| `slug` | text | Generated from the title |
| `createdAt` | timestamptz | Defaults to now |
| `editedAt` | timestamptz? | Set on first edit |
| `ups` | int | Count of `+1` votes |
| `downs` | int | Count of `-1` votes |
| `score` | int | Always `ups - downs` |
| `hotRank` | float8 | Denormalized hot score |
| `commentCount` | int | Active comment count |
| `status` | `PostStatus` | Default `ACTIVE` |

Indexes exist for `(status, hotRank, id)`, `(status, createdAt, id)`, `(status, score, id)`, the same three scoped by `communityId`, and `(authorId, createdAt)`.

### `PostVote`

| Column | Type | Notes |
| --- | --- | --- |
| `userId` | UUID | Part of composite primary key |
| `postId` | UUID | Part of composite primary key |
| `value` | int | `-1`, `0`, or `1` |

The composite primary key `(userId, postId)` is what enforces **at most one vote per user per post**. There is no separate id.

### `Community` and `CommunityMember`

| `Community` | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `name` | text | Unique, 3–21 chars, `[a-zA-Z0-9_]` |
| `description` | text? | Up to 500 chars |
| `iconUrl`, `bannerUrl` | text? | Optional media |
| `createdAt` | timestamptz | |
| `creatorId` | UUID | FK to `User` |

| `CommunityMember` | Type | Notes |
| --- | --- | --- |
| `userId` | UUID | Composite primary key |
| `communityId` | UUID | Composite primary key |
| `role` | `CommunityRole` | Default `MEMBER` |
| `joinedAt` | timestamptz | Used for ordering “my communities” |

A case-insensitive unique index (`lower(name)`) makes `r/WebDev` and `r/webdev` the same community.

### `Comment` and `CommentVote`

Comments mirror posts: `ups`, `downs`, `score`, `status`, a self-referencing `parentId` for threads, and a `CommentVote` table with the same `(userId, commentId)` primary key. The schema and constraints are in place, but the comment API and UI are outside this slice; the discussion page renders a placeholder.

### Database invariants

Added in `20261127004910_add_post_invariants`:

```sql
ALTER TABLE "Post"
  ADD CONSTRAINT post_ups_nonnegative CHECK (ups >= 0),
  ADD CONSTRAINT post_downs_nonnegative CHECK (downs >= 0),
  ADD CONSTRAINT post_score_matches_votes CHECK (score = ups - downs);

ALTER TABLE "Comment" -- same three checks

ALTER TABLE "PostVote"
  ADD CONSTRAINT post_vote_value_valid CHECK (value IN (-1, 0, 1));

ALTER TABLE "CommentVote" -- same value check

CREATE UNIQUE INDEX "Community_name_lower_key" ON "Community" (lower(name));
```

These constraints mean a counter bug fails loudly instead of silently corrupting data. Because every vote has a row, `score = ups - downs` also equals `SUM(PostVote.value)` for the post.

---

## 4. Post lifecycle

### Create

`POST /api/communities/:name/posts` runs a single transaction:

1. Resolve the community by case-insensitive name (404 if missing).
2. Insert the post with a slug generated from the title.
3. Insert a real `PostVote` row `(author, post, +1)`.
4. Update the post to `ups = 1`, `downs = 0`, `score = 1`, `hotRank = computeHotRank(1, createdAt)`.

The author’s self-upvote is stored as an actual vote row, not just an initial counter value. That keeps the proof `score = SUM(votes.value)` true from the first moment and lets the author later remove or switch that vote.

A new post therefore starts at score `1`, like Reddit.

### Read

`GET /api/posts/:id` returns the post plus:

- `myVote`: the viewer’s vote (`0` when logged out)
- `viewerJoined`: whether the viewer is a member of the post’s community
- `viewerIsModerator`: creator or `MODERATOR` membership

The list endpoints return the same DTO minus `viewerIsModerator`.

### Edit

`PATCH /api/posts/:id` is author-only and only while `status = ACTIVE`. It compares incoming title/body against stored values, updates only real changes, and sets `editedAt`. If nothing changed it returns the post unchanged.

### Delete vs remove

| Action | Endpoint | Who | Result |
| --- | --- | --- | --- |
| Delete | `DELETE /api/posts/:id` | Author | `status = DELETED` |
| Remove | `POST /api/posts/:id/remove` | Community creator or moderator | `status = REMOVED` |

Both are soft deletes. Feeds filter on `status = 'ACTIVE'`, so the post disappears from listings but its row and votes remain. The detail page still resolves it and shows `[deleted]` or `[removed]` with an explanation.

### TL;DR convention

Seed data marks long-form posts with a `TL;DR: ` prefix in the title. The client parses this prefix with `splitTldr()`:

- `PostCard` and the post detail heading render a small **TL;DR** badge followed by the text without the prefix.
- The raw title is preserved in the database and in the edit form.

This is a display convention only; the API stores the title as-is.

### Body preview

List responses include `bodyPreview`, the first 280 characters of `body`. Cards use it for the collapsed preview; the detail page uses the full `body`.

---

## 5. Concurrent voting system

This is the core correctness requirement: **each user has at most one vote per post, and switching or removing a vote must update the score correctly even when many requests arrive at once.**

### Endpoint

```
PUT /api/posts/:id/vote
Authorization: Bearer <access token>
Content-Type: application/json

{ "value": 1 }    // 1 = upvote, -1 = downvote, 0 = no vote
```

Authentication is required. The response is the authoritative state after the transaction:

```json
{ "ups": 43, "downs": 1, "score": 42, "myVote": 1 }
```

### The transaction

Every vote runs inside `prisma.$transaction` with four steps:

1. **Lock the post row.**

   ```sql
   SELECT id, status, ups, downs, score
   FROM "Post"
   WHERE id = $1
   FOR UPDATE;
   ```

   This both validates the post and serializes all votes on that post. Concurrent voters on the same post wait here; voters on different posts do not block each other.

2. **Lock and read the voter’s existing row.**

   ```sql
   SELECT value
   FROM "PostVote"
   WHERE "userId" = $1 AND "postId" = $2
   FOR UPDATE;
   ```

   No row means the old value is `0`.

3. **If the value did not change, return early.** Sending the same vote twice is a no-op, so the counters are not touched.

4. **Upsert the vote row and apply relative deltas.**

   ```sql
   INSERT INTO "PostVote" ("userId", "postId", "value")
   VALUES ($1, $2, $3)
   ON CONFLICT ("userId", "postId") DO UPDATE SET value = EXCLUDED.value;
   ```

   The deltas are computed from the old and new values, not from a client-supplied score:

   | Old | New | Δups | Δdowns | Δscore |
   | --- | --- | --- | --- | --- |
   | 0 | 1 | +1 | 0 | +1 |
   | 0 | -1 | 0 | +1 | -1 |
   | 1 | 0 | -1 | 0 | -1 |
   | 1 | -1 | -1 | +1 | -2 |
   | -1 | 0 | 0 | -1 | +1 |
   | -1 | 1 | +1 | -1 | +2 |

   The update uses `ups = ups + Δ`, `downs = downs + Δ`, and `score = score + Δ`. The database performs the arithmetic, so no read-modify-write race exists in application code.

5. **Recompute `hotRank` from the new score.**

   ```sql
   UPDATE "Post"
   SET ups = ups + $dUp,
       downs = downs + $dDown,
       score = score + $dScore,
       "hotRank" = sign((score + $dScore)::float8)
                 * log(greatest(abs(score + $dScore), 1)::float8)
                 + ((extract(epoch FROM "createdAt") - 1134028003) / 45000.0)::float8
   WHERE id = $postId
   RETURNING ups, downs, score;
   ```

   In PostgreSQL, `SET` expressions read the **old** row. Writing `hotRank = f(score)` in the same statement would rank the previous score, one vote behind. Using `score + $dScore` makes the rank reflect the new score in the same update.

### Why this is correct under concurrency

- The post row lock makes vote processing for one post strictly sequential.
- The vote row primary key `(userId, postId)` makes duplicates impossible at the storage level.
- The upsert is idempotent; a retried request cannot create a second row.
- Counters change by relative deltas, so concurrent increments compose instead of overwriting each other.
- `CHECK (score = ups - downs)` and non-negative checks reject any drift at commit time.
- The vote row and the counter update commit or roll back together.

Because `PostVote` holds every vote and `score` is the sum of those values, the grader can verify `Post.score = SUM(PostVote.value)` directly. The author’s initial `+1` is a real row, so this holds for new posts too.

### Error cases

| Status | Cause |
| --- | --- |
| 400 | `value` is not `-1`, `0`, or `1` |
| 401 | Missing or invalid access token |
| 404 | Post does not exist |
| 409 | Post is not `ACTIVE` (deleted or removed) |

Voting on a removed post is rejected inside the locked transaction, so a removal cannot be bypassed by a vote that started a moment earlier.

### Client behavior

`useVote` implements an optimistic, coalescing queue:

1. Clicking an arrow updates the local score and `myVote` immediately using the delta.
2. The desired value is stored in a ref (`targetRef`).
3. If no request is running, `flush()` starts.
4. `flush()` sends the current target, then checks whether the target changed while the request was in flight. If it did, it sends the newest target; otherwise it settles with the server response.
5. If a request fails, the hook refetches the post and restores the server’s score and vote.

This prevents out-of-order responses from an impatient user clicking up, down, and up again.

### Concurrency test

`npm --prefix server run vote:race`:

- Creates a temporary post with 120 seeded users.
- Runs three rounds of 120 concurrent votes (concurrency capped at 20) with mixed `-1`, `0`, `1`.
- Then one user flips the same post 50 times.
- Queries the post counters, recounts votes from `PostVote`, and checks for duplicate vote rows.
- Deletes the temporary post.

Expected result:

```
PASS: counters match the vote rows.
duplicate vote rows: 0
```

### Integrity check

`npm --prefix server run db:reconcile` scans every post and reports any row where `ups`, `downs`, or `score` disagrees with the vote rows:

```
OK: every post counter matches its vote rows.
```

Run it after seeding, after load tests, or whenever counters are suspected.

---

## 6. Feeds, sorting, and pagination

### Feed definitions

| Feed | Who sees it | Content |
| --- | --- | --- |
| `home` | Logged in | Posts from communities the viewer has joined |
| `home` | Logged out | Falls back to `popular` |
| `popular` | Everyone | All active posts |

The controller enforces the fallback: a logged-out request with `feed=home` is served as `popular`, and the response includes the effective `feed`.

### Sort modes

| Sort | Key | Behavior |
| --- | --- | --- |
| `best` | `hotRank` (+ `0.25` if joined) | Default home sort for logged-in users |
| `hot` | `hotRank` | Default popular and community sort |
| `new` | `createdAt` | Newest first |
| `top` | `score` | Highest score inside a time window |

`best` is Hot plus a membership boost. `0.25` hot units is roughly 3.1 hours of freshness (`0.25 × 45,000` seconds). Logged-out users have no memberships, so `best` collapses to `hot`.

### Hot rank

```ts
const REDDIT_EPOCH = 1134028003;

hotRank = sign(score) * log10(max(abs(score), 1))
        + (createdAtSeconds - REDDIT_EPOCH) / 45000;
```

- One unit of rank equals 45,000 seconds (12.5 hours) of age.
- A post with 10× the score gains one rank unit.
- Negative scores are handled with `sign` and `abs`.

`hotRank` is stored on the post and updated inside the vote transaction, so feed queries can use an index instead of computing the formula per row.

### Top time windows

`t` accepts `hour`, `day`, `week`, `month`, `year`, or `all`.

- `all` means no lower bound.
- Other windows filter `createdAt >= windowStart`.
- The window start is computed **once**, on the first page, and stored in the cursor as `t0`. Later pages reuse it, so a post does not fall out of the window between page 1 and page 2.

### Cursor pagination

Feeds use keyset pagination, not offset pagination. Each response is one page:

```json
{
  "items": [ ...posts... ],
  "nextCursor": "eyJ2IjoxLCJzb3J0IjoiaG90IiwidCI6ImRheSIsImlkIjoiLi4uIn0",
  "feed": "popular"
}
```

Send `nextCursor` back as `?cursor=` to get the next page. `nextCursor` is `null` when there are no more rows.

Cursor payload (base64url-encoded JSON):

```json
{ "v": 1, "sort": "hot", "t": "day", "id": "<last post id>", "t0": "<ISO date, top only>" }
```

The cursor deliberately does **not** store the numeric sort key. Instead, the next query loads the key from the anchor row by id:

```sql
WITH anchor AS (
  SELECT <sort key expression> AS k FROM "Post" p WHERE p.id = $cursorId
)
SELECT p.id
FROM "Post" p, anchor
WHERE p.status = 'ACTIVE'
  AND (p."communityId" = $communityId OR ...)
  AND (<sort key>, p.id) < (anchor.k, $cursorId)
ORDER BY <sort key> DESC, p.id DESC
LIMIT $limit + 1;
```

Why read the key from the row instead of the cursor? Floating-point ranks were serialized to JSON and back with a tiny rounding error in an earlier implementation, which made the cursor row compare as “less than itself” and appear again on the next page. Reading the exact stored value removes that class of bug entirely.

Why `(key, id)`? A single-column cursor can skip or duplicate posts when two rows share a key. `createdAt` collisions are common in seeded data, and `score` collisions are common everywhere. The id is the final tie-break.

Why `LIMIT limit + 1`? Fetching one extra row tells the server whether another page exists without a separate count query. The extra row is not returned.

Cursor validation:

- A cursor that fails to decode → `400 Invalid cursor`.
- A cursor whose `sort` or `t` differs from the current query → `400 Cursor does not match this feed`.
- Cursors survive soft deletes because the anchor row still exists. Hard-deleting a post (for example by deleting its community) can invalidate a cursor that points at it; the page then comes back empty rather than returning wrong data.

### Scoping

The same listing function serves three scopes:

- **Popular:** no scope filter.
- **Community:** `communityId = :id`.
- **Home:** `communityId IN (SELECT communityId FROM CommunityMember WHERE userId = :viewer)`.

### Page size and limits

- Default `limit`: 25.
- Allowed range: 1–100.
- Community posts use the same defaults.
- Search uses page-based pagination (see below), default 10, max 50.

### Hydration

The listing query returns ids only. A second query loads the posts with author and community, a third loads the viewer’s votes, and a fourth loads the viewer’s memberships for the returned communities. This avoids N+1 queries and keeps `myVote` and `viewerJoined` accurate per viewer.

---

## 7. Communities

### Roles and permissions

| Role | How you get it | Powers |
| --- | --- | --- |
| `MEMBER` | Join a community | See it in Home, get the Best boost |
| `MODERATOR` | Create the community (automatic) | Remove posts, treated as joined |
| Creator | `Community.creatorId` | Same as moderator, plus ownership |

There is no endpoint to promote another user to moderator in this slice. The creator is always a moderator, even if the membership row is later removed, because moderation checks also compare `creatorId`.

### Creating a community

`POST /api/communities` requires authentication and a unique name.

Validation:

- 3–21 characters
- letters, numbers, underscores only
- description up to 500 characters

The service first checks case-insensitively for an existing name and returns `409` if found. It then runs a transaction:

1. Insert the community.
2. Insert a `CommunityMember` row for the creator with `role = MODERATOR`.

Both rows commit together, so a community can never exist without its creator being a member. The database’s `lower(name)` unique index is the final guard against two concurrent creations of the same name.

### Joining and leaving

`POST /api/communities/:name/join`

- Uses an upsert on `(userId, communityId)`.
- If the row exists, `update: {}` leaves the role untouched. A moderator who clicks Join cannot accidentally demote themselves.
- Joining twice is a no-op.

`DELETE /api/communities/:name/join`

- Deletes the membership row if present.
- Leaving twice is a no-op.
- It does not delete the user’s posts or votes.

Both endpoints return `204`.

### Community page data

`GET /api/communities/:name` returns:

- community details, creator summary
- `memberCount` (all membership rows)
- `postCount` (only `ACTIVE` posts)
- `viewerJoined`
- `viewerIsModerator` (creator or moderator role)

Names are matched case-insensitively, so `/r/WebDev` resolves `webdev`.

### Community feed

`GET /api/communities/:name/posts` accepts the same `sort`, `t`, `cursor`, and `limit` parameters as the main feed and returns one page plus the community object. Posts are always filtered to that community and `status = 'ACTIVE'`.

### Moderation

`POST /api/posts/:id/remove` is allowed when the requester is:

- the community creator, or
- a member with `role = MODERATOR`.

It sets `status = REMOVED`. The author cannot undo it; the post remains visible on its detail page as `[removed]`, but disappears from feeds and search.

The author’s own `DELETE /api/posts/:id` sets `status = DELETED` instead.

### Community list and “my communities”

- `GET /api/communities?q=&limit=` lists communities by member count (descending), then name. `q` filters by name substring. Limit defaults to 20, max 100.
- `GET /api/communities/mine` requires auth and returns the viewer’s communities ordered by `joinedAt` descending, with the viewer’s role. The left sidebar uses this.

### Relationship to ranking

Membership affects the `best` feed only: a post in a joined community gets `+0.25` hot units. It does not change `hot`, `new`, or `top`, and it does not affect the stored `hotRank`.

### UI behavior

- The community page shows a banner, icon, name, member/post counts, and Join/Joined buttons.
- Joined buttons show “Leave” on hover.
- The header has a Create Post button that routes to `/r/:community/submit`.
- The right sidebar shows the description, counts, creation date, and moderator.
- The feed below uses the shared post card, with the community label hidden because the context is already the community.

---

## 8. Search

`GET /api/posts/search?q=&page=&limit=` searches active posts by title or body, case-insensitively, ordered by `hotRank` then id. Pagination is page-based and returns:

```json
{
  "items": [ ...posts... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 193,
    "totalPages": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

- `q` is required, trimmed, 1–100 characters.
- `limit` defaults to 10, max 50.
- Each item includes `myVote` and `viewerJoined` for the requesting viewer.

The search page combines this with the existing user search (`GET /api/users/search`) and shows two sections:

- **Posts**, rendered with the same `PostCard` component used by feeds. Deleting a post removes it from the local list.
- **People**, with avatar, display name, username, bio, and a profile link.

Both sections share the `?q=&page=` URL state, and one Previous/Next control drives the page. The navbar search box still offers a live user dropdown, and submitting navigates to `/search?q=...`.

---

## 9. API reference

Base URL: `http://localhost:5000`

### Feed and posts

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/feed` | Optional | Home or popular feed |
| GET | `/api/posts/search` | Optional | Search posts by title/body |
| GET | `/api/posts/:id` | Optional | Post detail |
| PATCH | `/api/posts/:id` | Required | Edit own post |
| DELETE | `/api/posts/:id` | Required | Soft-delete own post |
| POST | `/api/posts/:id/remove` | Required | Moderator removal |
| PUT | `/api/posts/:id/vote` | Required | Cast/switch/remove vote |

### Communities

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/communities` | No | List communities |
| POST | `/api/communities` | Required | Create community |
| GET | `/api/communities/mine` | Required | Joined communities |
| GET | `/api/communities/:name` | Optional | Community details |
| GET | `/api/communities/:name/posts` | Optional | Community feed |
| POST | `/api/communities/:name/posts` | Required | Create post |
| POST | `/api/communities/:name/join` | Required | Join |
| DELETE | `/api/communities/:name/join` | Required | Leave |

### Query parameters

`GET /api/feed`

| Name | Values | Default |
| --- | --- | --- |
| `feed` | `home`, `popular` | `home` |
| `sort` | `best`, `hot`, `new`, `top` | `best` |
| `t` | `hour`, `day`, `week`, `month`, `year`, `all` | `day` |
| `cursor` | opaque string | none |
| `limit` | 1–100 | 25 |

`GET /api/communities/:name/posts` uses `sort` (default `hot`), `t`, `cursor`, and `limit`.

`GET /api/posts/search` uses `q` (required), `page` (default 1), and `limit` (default 10, max 50).

### Example: vote flow

```bash
# login
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"demo","password":"password123"}'

# upvote
curl -s -X PUT http://localhost:5000/api/posts/<postId>/vote \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"value":1}'

# switch to downvote
curl -s -X PUT http://localhost:5000/api/posts/<postId>/vote \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"value":-1}'

# remove the vote
curl -s -X PUT http://localhost:5000/api/posts/<postId>/vote \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"value":0}'
```

### Error shape

```json
{ "error": "Post not found" }
```

Validation errors include details:

```json
{
  "error": "Validation failed",
  "details": [{ "field": "title", "message": "Title is required" }]
}
```

The OpenAPI specification at `server/docs/openapi.json` documents every path covered in this document, including request bodies, parameters, and response schemas.

---

## 10. Frontend

### Routes

| Path | Page | Notes |
| --- | --- | --- |
| `/` | `HomePage` | Home feed when logged in, popular when logged out |
| `/popular` | `PopularPage` | Popular feed |
| `/r/:community` | `CommunityPage` | Community header + feed |
| `/r/:community/submit` | `CreatePostPage` | Pre-selected community |
| `/r/:community/comments/:postId/:slug?` | `PostPage` | Discussion |
| `/submit` | `CreatePostPage` | Community picker |
| `/search` | `SearchPage` | Posts + people |
| `/u/:username` | `ProfilePage` | Existing profile page |
| `/settings` | `SettingsPage` | Existing settings page |

### Components

| Component | Responsibility |
| --- | --- |
| `AppShell` | Three-column layout: left nav, feed column, optional right sidebar |
| `FeedPage` | Shared feed page: title, sort bar, infinite feed, empty state |
| `PostCard` | Feed card: community, time, title, preview, vote pill, comments, share, author/mod actions |
| `VotePill` | Upvote/score/downvote control with filled states |
| `SortBar` | Sort dropdown and Top time dropdown |
| `InfiniteFeed` | Skeleton, sentinel, load-more, error, and end-of-feed states |
| `PostSkeleton` | Loading placeholder |
| `Sidebars` | Popular communities and community About card |
| `CommunityIcon` | Community image or deterministic colored initial |
| `Navbar` | 48px bar with logo, search, auth actions, Create button |

### Hooks

**`useFeed(key, loadPage)`**

- Reloads when `key` changes. Feed pages use keys like `home:best:day`.
- Guards against stale responses with an incrementing request id.
- Deduplicates appended items by id.
- Exposes `items`, `loading`, `loadingMore`, `error`, `hasMore`, `loadMore`, `reload`, `removeItem`.
- `InfiniteFeed` triggers `loadMore` with an `IntersectionObserver` using a 600px root margin.

**`useVote(post, onChange)`**

- Optimistic score/vote updates.
- Coalesces rapid clicks into the latest target.
- Refetches on failure.
- Opens the auth modal when a logged-out user votes.

### Sort and time state

Feed pages read `sort` and `t` from the URL (`?sort=hot&t=week`), so sorting is shareable and survives reloads. Changing the sort replaces the URL entry and resets the feed through the `useFeed` key.

Defaults:

- Logged-in home: `best`
- Logged-out home / popular: `hot`
- Community: `hot`

`best` is hidden from the sort menu on community pages and shown on the home feed.

### Post interactions

- **Vote:** optimistic, requires auth.
- **Join:** joins the post’s community from the card; hidden once joined.
- **Share:** copies the post URL to the clipboard and shows “Copied” briefly.
- **Comments:** links to the discussion page.
- **Edit:** author only, opens the detail page with `?edit=1`.
- **Delete:** author only, confirms, soft-deletes, removes the card.
- **Remove:** moderators only, confirms, removes the card.

### Post detail

- Shows community, author, timestamp, title (with TL;DR badge), body or link, and vote/comment/share actions.
- Inline editing for the author with Save/Cancel.
- Delete and moderator remove actions.
- `PostSummarizer` appears for active posts with a body. It calls the AI endpoint and renders the summary; the feature is optional and depends on `GEMINI_API_KEY`.
- The comments area is a placeholder because comments are outside this slice.

### Create post

- Community dropdown (or fixed community from the route).
- Text/Link tabs.
- Title with a 300-character counter.
- Optional body or URL.
- Client-side disabled state until valid; server-side Zod validation remains authoritative.
- On success, redirects to the new post’s discussion page.

### Styling

The new surfaces use design tokens appended to `client/src/index.css`:

- White canvas, 16px card radius, 9999px pills.
- Upvote orange `#d93a00`, downvote indigo `#6a5cff`, primary blue `#0045ac`.
- 48px navbar, pill search field, 270px left nav, 740px feed column, 316px right sidebar.
- Legacy pages keep their existing classes and tokens; the new tokens live alongside them, so the two visual systems can coexist while the rest of the app is migrated.

---

## 11. Seed data and maintenance

### What the seed creates

- 153 users: `demo`, `alice`, `bob`, plus `user1`…`user150`, all with password `password123`.
- 20 communities covering programming, gaming, movies, music, books, science, cooking, fitness, photography, university, careers, design, startups, and data science.
- 2,500 posts by default (`SEED_POSTS` overrides the count).
- About 20% of posts are long-form (roughly 1,800–2,200 characters across multiple paragraphs) and carry a `TL;DR: ` title prefix.
- Each post gets an author upvote plus up to 44 additional votes with a mostly positive distribution.
- The first 900 posts get 1–5 comments each.
- Post counters and `hotRank` are rebuilt from the vote rows at the end.

The seed is safe to rerun for users and communities, but it skips posts if any post already exists:

```
Skipping post seed: N posts already exist.
```

To get a clean reseed:

```bash
cd server
npx prisma migrate reset --force
```

That drops the schema, reapplies all migrations, and runs the seed automatically.

### Reconciliation

`prisma/reconcile.ts` compares each post’s stored counters with a live recount:

```sql
COUNT(v.value) FILTER (WHERE v.value = 1)  AS real_ups
COUNT(v.value) FILTER (WHERE v.value = -1) AS real_downs
COALESCE(SUM(v.value), 0)                  AS real_score
```

Any mismatch is printed as a table and the process exits non-zero.

### Vote race test

`scripts/vote-race.ts` creates a temporary post, generates JWTs for 120 seeded users, and runs concurrent vote rounds plus a rapid flip sequence. It then asserts:

- stored counters equal the recount
- `score = ups - downs`
- no user has more than one vote row for the post

The temporary post is deleted at the end.

---

## 12. Operational notes and limitations

### Behavior worth knowing

- **Soft deletes only.** `DELETED` and `REMOVED` posts remain in the database and on their detail page, but are excluded from feeds and search.
- **Names are case-insensitive.** Community lookup and creation both compare `lower(name)`.
- **Author self-vote is a real vote.** New posts start at score 1, and the author can remove that vote like any other.
- **`viewerIsModerator` is detail-only.** Feed DTOs omit it, so the Remove action appears on the post detail page, not on feed cards.
- **`best` needs a viewer.** Without memberships it is identical to `hot`.
- **Top windows are frozen per pagination session.** The cursor stores `t0`; starting a new feed recomputes it.
- **Cursor scope is strict.** Reusing a cursor with a different sort or time window returns 400 instead of silently producing a mixed page.
- **No offset pagination on feeds.** Page numbers are used only for search.

### Current limitations

- Comment threads have schema and constraints but no API or UI in this slice; the discussion page shows a placeholder.
- Image posts are accepted by the schema and validation, but the create form exposes only Text and Link.
- Search is page-based and scans title/body with `ILIKE`; there is no full-text index yet.
- No rate limiting on votes or post creation.
- No endpoint for promoting moderators or transferring community ownership.
- The AI summarizer depends on an external API key and is not part of the graded voting/feed behavior.
- `server/.env` is git-ignored; each environment needs its own copy.

---

## 13. Verification checklist

Run these after a fresh checkout or a schema change:

```bash
npm run build
npm --prefix server run db:reconcile
npm --prefix server run vote:race
```

Manual API checks:

```bash
# feed
curl "http://localhost:5000/api/feed?feed=popular&sort=top&t=week&limit=5"

# next page
curl "http://localhost:5000/api/feed?feed=popular&sort=top&t=week&limit=5&cursor=<nextCursor>"

# community
curl "http://localhost:5000/api/communities/webdev"
curl "http://localhost:5000/api/communities/webdev/posts?sort=new&limit=5"

# search
curl "http://localhost:5000/api/posts/search?q=pagination&page=1&limit=5"
```

Expected:

- No duplicate post ids across consecutive pages for `best`, `hot`, `new`, or `top`.
- `vote:race` prints `PASS` and `duplicate vote rows: 0`.
- `db:reconcile` prints `OK`.
- Search returns long-form posts with multi-paragraph bodies when the query matches them.
- Voting up, down, and back to zero moves the score by +1, -2, and +1 respectively, and the score always equals `ups - downs`.
