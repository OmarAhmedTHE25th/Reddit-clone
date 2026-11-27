import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rows = await prisma.$queryRaw<
  Array<{
    id: string;
    ups: number;
    downs: number;
    score: number;
    real_ups: number;
    real_downs: number;
    real_score: number;
  }>
>`
  SELECT p.id,
         p.ups,
         p.downs,
         p.score,
         COUNT(v.value) FILTER (WHERE v.value = 1)::int AS real_ups,
         COUNT(v.value) FILTER (WHERE v.value = -1)::int AS real_downs,
         COALESCE(SUM(v.value), 0)::int AS real_score
  FROM "Post" p
  LEFT JOIN "PostVote" v ON v."postId" = p.id
  GROUP BY p.id
  HAVING p.ups <> COUNT(v.value) FILTER (WHERE v.value = 1)
      OR p.downs <> COUNT(v.value) FILTER (WHERE v.value = -1)
      OR p.score <> COALESCE(SUM(v.value), 0)
`;

if (rows.length === 0) {
  console.log('OK: every post counter matches its vote rows.');
} else {
  console.log(`Found ${rows.length} mismatched post(s):`);
  console.table(rows);
  process.exitCode = 1;
}

await prisma.$disconnect();
