const REDDIT_EPOCH = 1134028003;

/**
 * Reddit's original hot ranking.
 * 1.0 rank unit == 45,000 seconds (12.5 hours) of age.
 */
export function computeHotRank(score: number, createdAt: Date): number {
  const sign = Math.sign(score);
  const magnitude = Math.log10(Math.max(Math.abs(score), 1));
  const age = createdAt.getTime() / 1000 - REDDIT_EPOCH;
  return sign * magnitude + age / 45000;
}
