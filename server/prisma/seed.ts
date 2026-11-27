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

const LONG_BODIES = [
  `Background

I started this project at the beginning of the semester with a very naive plan: build the database, build the API, build the UI, done. Three months later I have a much better appreciation for why people say the hard part is not writing code, it is deciding what the code should do.

The first version stored a post score as a plain integer on the post row and incremented it whenever someone clicked an arrow. It worked perfectly in my demo. It fell apart the moment I opened two browser tabs and voted from both of them at the same time. The score jumped by two, but only one vote row existed.

What I changed

I moved the counter updates into a transaction that locks the post row first, reads the previous vote value, and applies a delta. The key insight was that the database should own the invariant, not the application. I added a check constraint so that score must equal ups minus downs, which means a bug now fails loudly instead of quietly corrupting data.

The second change was pagination. My original feed used OFFSET, which is fine until posts are created while you scroll. Halfway down page three you start seeing duplicates, and if you are unlucky you skip posts entirely. I switched to keyset pagination with a composite cursor of rank plus id. Ties are real: two posts can have exactly the same rank, and without the id tie-break the database is free to return them in either order.

What I would tell a first-year student

Do not optimize before you have a query plan. I spent an entire evening tuning an index that Postgres was not even using, because the planner had decided a sequential scan was cheaper for my table size. EXPLAIN ANALYZE would have saved me four hours.

Also, write the test that reproduces the bug before you fix it. My vote race test is twenty lines long and it has caught two regressions since I wrote it. That is a much better return on investment than the hour I spent making my folder structure look tidy.

Next steps

I want to add comment votes using the same pattern, then load test the feed with a few thousand concurrent readers. If anyone has done that with Prisma and Neon, I would love to hear how you handled connection pooling.`,

  `The short version: I lost a weekend to a bug that was one missing await.

Long version

I was building the create-post flow. The client sent a title and body, the server inserted a row, and then it immediately returned the post so the UI could navigate to the discussion page. Everything looked fine in development because the request finished in about forty milliseconds.

Then I added an automatic self-upvote. Reddit does this: your own post starts at one point. I created the vote row and updated the post counters in a second query. I forgot to await the update. Most of the time it finished before the response was serialized, so the client saw the right score. Occasionally it did not, and the page showed zero until you refreshed.

Why it was hard to find

The bug was timing dependent, so it never appeared when I was stepping through with a debugger. It also never appeared in the first ten manual tests. It showed up when I clicked through the flow quickly on a slower connection, which is exactly the situation a grader will be in.

The fix was trivial. The lesson was not. I now treat every database write as something that must be awaited explicitly, and I keep the transaction boundary as small as I can while still covering the invariant.

A checklist I now use

1. Does this write need to succeed before the response is sent?
2. If it fails, what does the user see?
3. Can a retry create a duplicate row?
4. Is there a unique constraint that makes the retry safe?
5. Can I reproduce the failure with a test?

That last question is the one I used to skip. It is also the one that would have saved me the weekend.

If you are building something similar, my advice is to make the happy path boring and explicit. Clever shortcuts around async code are how you end up debugging at 2am.`,

  `I rewrote my feed component three times and the third version is the one I am keeping.

Version one used a single useEffect that fetched everything and stored it in one state variable. It was easy to read and impossible to extend. Adding a sort dropdown meant refetching, which meant clearing the list, which meant the page jumped to the top while the user was reading.

Version two moved the fetching into a custom hook. That was better, but I made the classic mistake of putting the fetch function in the dependency array. The hook recreated the function on every render, the effect ran again, and I DDOSed my own API. I only noticed because the server logs showed forty requests for one page load.

Version three separates three things: the request key, the loader, and the state machine. The key is a string like home:best:day. When the key changes, the hook resets and loads the first page. The loader is held in a ref so a new function identity does not restart the request. The state machine tracks loading, loading more, error, and whether there is a next cursor.

What this bought me

Infinite scroll now works without duplicates. If a page arrives late, the request id tells me to ignore it. If the user changes the sort while a request is in flight, the old response cannot overwrite the new one. If a post is deleted from the feed, I remove it locally instead of refetching everything.

The whole hook is about a hundred lines. It is not clever, and that is the point. Every line exists because a specific bug forced it to.

What I would do differently

I would write the key first. Deciding what identifies a feed before writing any fetching code makes the rest of the component fall into place. I would also test the hook in isolation with a fake loader that resolves out of order, because that is the failure mode that is hardest to catch by clicking around.

If you are building a feed for a class project, start with the boring version. Get one page rendering, then add a cursor, then add a second page. Do not start with infinite scroll and optimistic updates.`,

  `Context: I am a third-year computer engineering student, and this semester I did a co-op term at a company that builds developer tools.

What surprised me

The codebase was older than I expected. Not ancient, but old enough that the original authors had moved on and the current team was afraid to touch the billing module. Nobody said it was untouchable. It just was.

The first task I got was to add a small feature to that module. It took me four days to make a change that would have taken twenty minutes in a fresh project. Most of that time was spent understanding why a function named calculateTotal was called from three places that all passed slightly different arguments.

What I learned about reading code

I stopped trying to understand everything and started following one path at a time. Pick a request, follow it from the route to the database, write down every function it touches. Then pick the next request. After a week the map in my notebook was more useful than any documentation.

I also learned to ask why before how. Why is this check here? Why does this value get rounded twice? Half the time the answer was a bug that had been promoted to a requirement. The other half it was a real constraint I would have broken.

What I would tell someone starting a co-op

Ask for a small task in your first week, even if it feels beneath you. Shipping something, anything, teaches you the deployment pipeline, the review process, and the naming conventions. Those are the things that make you useful.

Keep a running document of questions and answers. You will forget the answer to the same question three times otherwise, and people notice when you ask a fourth.

Do not apologize for asking. Apologize for not writing it down.

The part nobody tells you

The hardest part was not technical. It was realizing that a lot of decisions are made for reasons that are no longer visible, and that the right move is usually to match the existing pattern rather than to improve it in isolation. I am still not sure how I feel about that, but I understand it now.`,

  `I spent two weeks trying to make a slow query fast and I want to save someone else the trouble.

The query

The feed needed the top posts for a set of communities, ordered by a computed hot score, with a limit and a cursor. My first version joined posts to votes, grouped by post, computed the score, and sorted. On two thousand posts it was fine. On two hundred thousand it was not.

What I tried first

I added an index on the score column. The query planner ignored it, because the score was computed from an aggregate and the index was on the stored column, which was not the same thing.

Then I tried caching the score in Redis. That made the first page fast and made every write more complicated, and it did not solve the cold start problem at all.

Then I tried denormalizing the counters onto the post row. That is the version I kept, but only after I made the writes safe with row locks and check constraints.

What actually helped

The biggest win was reducing the number of rows the database had to consider before sorting. I added a partial index on active posts and included the rank column, so the planner could walk the index in order and stop after the limit. The second win was making the rank a stored column instead of an expression, which meant the index could actually be used.

The third win was smaller but satisfying: I changed the cursor comparison from a row constructor to an explicit pair of comparisons with the anchor row loaded separately. My first version was comparing a floating point value that had been serialized to JSON and back, and the tiny rounding error meant the cursor row could appear again on the next page.

What I would do next time

Read the query plan before touching anything. Write down the row counts at each step. Then change one thing at a time and re-read the plan.

Most of all, do not trust a benchmark you ran once. My first timing was on a warm cache with a tiny table. The numbers were meaningless.`,
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
    // Roughly one in five posts is a long-form write-up. Those get a TL;DR
    // title marker and a multi-paragraph body so the AI summarizer has
    // something shorter to compress.
    const isLong = rand() < 0.2;
    const isLink = !isLong && rand() < 0.12;

    posts.push({
      id: randomUUID(),
      communityId: community.id,
      authorId,
      title: isLong ? `TL;DR: ${title}` : title,
      body: isLink ? null : isLong ? pick(LONG_BODIES) : pick(BODIES),
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
