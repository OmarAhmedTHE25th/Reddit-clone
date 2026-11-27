import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/slug.js';

const prisma = new PrismaClient();

const POST_COUNT = Number(process.env.SEED_POSTS ?? 2500);
const USER_COUNT = 150;
const PASSWORD = 'password123';

let seed = 42;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function randomDate(daysBack: number): Date {
  return new Date(Date.now() - Math.floor(rand() * daysBack * 86_400_000));
}

const COMMUNITIES = [
  ['webdev', 'A place for web developers to share projects and ask questions.'],
  ['programming', 'Computer programming discussions, news, and help.'],
  ['javascript', 'Everything about JavaScript and the web platform.'],
  ['reactjs', 'A community for React developers.'],
  ['learnprogramming', 'A subreddit for learning how to program.'],
  ['computerscience', 'Computer science theory, papers, and careers.'],
  ['gaming', 'A community for (almost) anything gaming related.'],
  ['movies', 'News and discussion about films.'],
  ['music', 'The musical world: news, releases, and discussion.'],
  ['books', 'A community for readers and book recommendations.'],
  ['todayilearned', 'You learn something new every day.'],
  ['askscience', 'Got a science question? Ask it here.'],
  ['cooking', 'Recipes, techniques, and kitchen talk.'],
  ['fitness', 'Training, nutrition, and progress.'],
  ['photography', 'Photos, gear, and technique.'],
  ['university', 'Student life, courses, and campus talk.'],
  ['cscareerquestions', 'Questions about careers in software.'],
  ['design', 'Design inspiration, critique, and resources.'],
  ['startups', 'Building and launching new products.'],
  ['datascience', 'Data, statistics, and machine learning.'],
] as const;

const TITLE_PARTS = [
  'Finally shipped my first full-stack project',
  'What is the most underrated feature of modern JavaScript?',
  'How do you structure a React app in 2026?',
  'A small tip that saved me hours this week',
  'My professor said this was impossible, so I built it',
  'What are you working on this weekend?',
  'Is it worth learning TypeScript before React?',
  'I made a tiny tool for tracking study sessions',
  'The best debugging advice I ever received',
  'Why does this SQL query return duplicates?',
  'Looking for feedback on my portfolio site',
  'How do you stay motivated during long projects?',
  'A beginner-friendly explanation of indexes',
  'What is your favorite VS Code extension?',
  'I spent a month on this and it finally works',
  'How would you design a Reddit clone?',
  'The one thing I wish I knew before my first internship',
  'Postgres vs MySQL for a school project',
  'Show off your desk setup',
  'What is the hardest bug you have ever fixed?',
  'A quick guide to optimistic UI updates',
  'How do you handle pagination with changing data?',
  'My notes from building a REST API',
  'What should I learn after the basics?',
  'This community is surprisingly wholesome',
];

const BODIES = [
  'I have been working on this for a few weeks and would love some feedback. The main challenge was keeping the UI responsive while the data changed underneath it.',
  'Context: I am a third-year computer engineering student. I built this for a course project and learned a lot about transactions, indexing, and API design.',
  'The short version: measure first, then optimize. I spent two days guessing before running a profiler and finding the real bottleneck in one query.',
  'Happy to answer questions. I can share the repository and the design notes if anyone is interested.',
  'I tried a few approaches and the simplest one won. Sometimes the boring solution is the right one.',
  'This is a small write-up of what worked, what did not, and what I would do differently next time.',
  'Any advice is welcome, especially around testing and error handling. I am still figuring out how much structure is enough.',
  'I kept the scope deliberately small: one feature, done well, instead of five features half-finished.',
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const demoUsers = [
    { username: 'demo', email: 'demo@example.com', displayName: 'Demo User' },
    { username: 'alice', email: 'alice@example.com', displayName: 'Alice' },
    { username: 'bob', email: 'bob@example.com', displayName: 'Bob' },
  ];

  const users = [...demoUsers];
  for (let i = 1; i <= USER_COUNT; i += 1) {
    users.push({
      username: `user${i}`,
      email: `user${i}@example.com`,
      displayName: `User ${i}`,
    });
  }

  await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash })),
    skipDuplicates: true,
  });

  const allUsers = await prisma.user.findMany({
    where: { username: { in: users.map((u) => u.username) } },
    select: { id: true, username: true },
  });
  const userIds = allUsers.map((u) => u.id);

  const communities = [];
  for (const [index, [name, description]] of COMMUNITIES.entries()) {
    const creatorId = userIds[index % userIds.length];
    const community = await prisma.community.upsert({
      where: { name },
      update: {},
      create: { name, description, creatorId },
    });
    await prisma.communityMember.upsert({
      where: {
        userId_communityId: { userId: creatorId, communityId: community.id },
      },
      update: { role: 'MODERATOR' },
      create: {
        userId: creatorId,
        communityId: community.id,
        role: 'MODERATOR',
      },
    });
    communities.push(community);
  }

  const memberMap = new Map<string, string[]>();
  for (const community of communities) {
    const members = new Set<string>();
    const creator = await prisma.communityMember.findFirst({
      where: { communityId: community.id, role: 'MODERATOR' },
      select: { userId: true },
    });
    if (creator) members.add(creator.userId);

    const joinCount = 8 + Math.floor(rand() * 20);
    while (members.size < joinCount) {
      members.add(pick(userIds));
    }

    const memberIds = [...members];
    await prisma.communityMember.createMany({
      data: memberIds.map((userId) => ({
        userId,
        communityId: community.id,
        role: 'MEMBER',
      })),
      skipDuplicates: true,
    });
    memberMap.set(community.id, memberIds);
  }

  const existingPosts = await prisma.post.count();
  if (existingPosts > 0) {
    console.log(
      `Skipping post seed: ${existingPosts} posts already exist. ` +
        'Run "prisma migrate reset" for a clean reseed.'
    );
    return;
  }

  const posts: Array<{
    id: string;
    communityId: string;
    authorId: string;
    title: string;
    body: string | null;
    type: 'TEXT' | 'LINK';
    url: string | null;
    slug: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < POST_COUNT; i += 1) {
    const community = pick(communities);
    const members = memberMap.get(community.id) ?? userIds;
    const authorId = pick(members);
    const title = pick(TITLE_PARTS);
    const isLink = rand() < 0.12;

    posts.push({
      id: randomUUID(),
      communityId: community.id,
      authorId,
      title,
      body: isLink ? null : pick(BODIES),
      type: isLink ? 'LINK' : 'TEXT',
      url: isLink ? `https://example.com/${slugify(title)}-${i}` : null,
      slug: slugify(title),
      createdAt: randomDate(90),
    });
  }

  for (let i = 0; i < posts.length; i += 1000) {
    await prisma.post.createMany({ data: posts.slice(i, i + 1000) });
  }

  const votes: Array<{ userId: string; postId: string; value: number }> = [];
  for (const post of posts) {
    votes.push({ userId: post.authorId, postId: post.id, value: 1 });

    const voters = new Set<string>([post.authorId]);
    const extraVotes = Math.floor(rand() * 45);
    for (let i = 0; i < extraVotes; i += 1) {
      const userId = pick(userIds);
      if (voters.has(userId)) continue;
      voters.add(userId);
      const roll = rand();
      votes.push({
        userId,
        postId: post.id,
        value: roll < 0.78 ? 1 : roll < 0.94 ? -1 : 0,
      });
    }
  }

  for (let i = 0; i < votes.length; i += 5000) {
    await prisma.postVote.createMany({
      data: votes.slice(i, i + 5000),
      skipDuplicates: true,
    });
  }

  const commentRows: Array<{
    id: string;
    postId: string;
    authorId: string;
    body: string;
  }> = [];

  for (const post of posts.slice(0, Math.min(900, posts.length))) {
    const count = 1 + Math.floor(rand() * 5);
    for (let i = 0; i < count; i += 1) {
      commentRows.push({
        id: randomUUID(),
        postId: post.id,
        authorId: pick(userIds),
        body: pick([
          'This is really helpful, thanks for sharing.',
          'I ran into the same issue last semester. The fix was simpler than I expected.',
          'Nice write-up. Do you have a link to the source?',
          'The part about testing really resonates with me.',
          'I would add one thing: keep your transactions short.',
          'How long did this take you?',
        ]),
      });
    }
  }

  for (let i = 0; i < commentRows.length; i += 2000) {
    await prisma.comment.createMany({
      data: commentRows.slice(i, i + 2000),
    });
  }

  await prisma.$executeRaw`
    WITH stats AS (
      SELECT p.id,
             COUNT(v.value) FILTER (WHERE v.value = 1)::int AS ups,
             COUNT(v.value) FILTER (WHERE v.value = -1)::int AS downs,
             COALESCE(SUM(v.value), 0)::int AS score
      FROM "Post" p
      LEFT JOIN "PostVote" v ON v."postId" = p.id
      GROUP BY p.id
    ), comments AS (
      SELECT "postId", COUNT(*)::int AS cnt
      FROM "Comment"
      WHERE status = 'ACTIVE'
      GROUP BY "postId"
    )
    UPDATE "Post" p
    SET ups = s.ups,
        downs = s.downs,
        score = s.score,
        "commentCount" = COALESCE(c.cnt, 0),
        "hotRank" = sign(s.score::double precision)
                  * log(greatest(abs(s.score), 1)::double precision)
                  + ((extract(epoch FROM p."createdAt") - 1134028003) / 45000.0)::double precision
    FROM stats s
    LEFT JOIN comments c ON c."postId" = s.id
    WHERE p.id = s.id
  `;

  console.log(
    `Seeded ${users.length} users, ${communities.length} communities, ` +
      `${posts.length} posts, ${votes.length} votes, ${commentRows.length} comments.`
  );
  console.log(`Demo login: demo / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
