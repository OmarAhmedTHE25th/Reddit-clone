import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/utils/jwt.js';
import { computeHotRank } from '../src/utils/hot.js';

const BASE = process.env.API_URL ?? 'http://localhost:5000/api';
const CONCURRENCY = 20;
const prisma = new PrismaClient();

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

async function vote(token: string, postId: string, value: number) {
  const response = await fetch(`${BASE}/posts/${postId}/vote`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    throw new Error(
      `vote ${value} failed: ${response.status} ${await response.text()}`
    );
  }

  return response.json() as Promise<{
    ups: number;
    downs: number;
    score: number;
    myVote: number;
  }>;
}

async function main() {
  const community = await prisma.community.findFirst({
    select: { id: true },
  });
  const users = await prisma.user.findMany({
    take: 120,
    select: { id: true, username: true },
  });
  if (!community || users.length < 2) {
    throw new Error('Seed the database first (npm run prisma:seed).');
  }

  const author = users[0];
  const post = await prisma.post.create({
    data: {
      communityId: community.id,
      authorId: author.id,
      title: 'Vote race test',
      body: 'Temporary post used by scripts/vote-race.ts.',
      slug: 'vote-race-test',
    },
  });

  await prisma.postVote.create({
    data: { userId: author.id, postId: post.id, value: 1 },
  });
  await prisma.post.update({
    where: { id: post.id },
    data: { ups: 1, downs: 0, score: 1, hotRank: computeHotRank(1, post.createdAt) },
  });

  const tokens = users.map((user) =>
    signAccessToken({ sub: user.id, username: user.username })
  );

  const values = [-1, 0, 1];
  const rounds = [
    tokens.map((token, index) => ({ token, value: values[index % 3] })),
    tokens.map((token, index) => ({ token, value: values[(index + 1) % 3] })),
    tokens.map((token, index) => ({ token, value: values[(index + 2) % 3] })),
  ];

  for (const [roundIndex, round] of rounds.entries()) {
    await mapLimit(round, CONCURRENCY, ({ token, value }) =>
      vote(token, post.id, value)
    );
    console.log(`round ${roundIndex + 1}: ${round.length} concurrent votes`);
  }

  // One user flipping the same post repeatedly. The final value is whatever
  // request wins last; the counters must still match the vote row exactly.
  const flipper = tokens[1];
  await mapLimit(
    Array.from({ length: 50 }, (_, index) => index),
    CONCURRENCY,
    (index) => vote(flipper, post.id, values[index % 3])
  );
  console.log('one user flipped 50 times');

  const stats = await prisma.$queryRaw<
    Array<{
      ups: number;
      downs: number;
      score: number;
      real_ups: number;
      real_downs: number;
      real_score: number;
    }>
  >`
    SELECT p.ups,
           p.downs,
           p.score,
           COUNT(v.value) FILTER (WHERE v.value = 1)::int AS real_ups,
           COUNT(v.value) FILTER (WHERE v.value = -1)::int AS real_downs,
           COALESCE(SUM(v.value), 0)::int AS real_score
    FROM "Post" p
    LEFT JOIN "PostVote" v ON v."postId" = p.id
    WHERE p.id = ${post.id}
    GROUP BY p.id
  `;

  const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "userId"
      FROM "PostVote"
      WHERE "postId" = ${post.id}
      GROUP BY "userId"
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  const row = stats[0];
  const ok =
    row.ups === row.real_ups &&
    row.downs === row.real_downs &&
    row.score === row.real_score &&
    row.score === row.ups - row.downs &&
    duplicates[0].count === 0n;

  console.log(row);
  console.log(`duplicate vote rows: ${duplicates[0].count}`);
  console.log(ok ? 'PASS: counters match the vote rows.' : 'FAIL: counters drifted.');

  await prisma.post.delete({ where: { id: post.id } });
  if (!ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
