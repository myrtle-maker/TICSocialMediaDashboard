/**
 * Scores a post's hook effectiveness on a 0-100 scale where 50 = average.
 *
 * The score is calculated by comparing the post's engagement rate to the
 * account's average engagement rate using a logarithmic scale, which
 * prevents outliers from dominating the score.
 *
 * @param postEngagementRate - The engagement rate of the individual post (percentage)
 * @param avgEngagementRate  - The account's average engagement rate (percentage).
 *                             If undefined or zero, returns 50 (neutral).
 * @returns A score between 0 and 100 where:
 *          - 0   = dramatically underperforming
 *          - 50  = exactly average
 *          - 100 = dramatically outperforming
 */
export function scoreHook(
  postEngagementRate: number,
  avgEngagementRate?: number
): number {
  // If we have no baseline or the baseline is zero, return neutral
  if (!avgEngagementRate || avgEngagementRate <= 0) return 50;

  // If the post has zero engagement, return minimum
  if (postEngagementRate <= 0) return 0;

  // Calculate the ratio of post ER to average ER
  const ratio = postEngagementRate / avgEngagementRate;

  // Use a logarithmic scale centered at 50
  // ratio = 1.0 -> score = 50  (average)
  // ratio = 2.0 -> score = 75  (2x average)
  // ratio = 4.0 -> score = 100 (4x+ average, capped)
  // ratio = 0.5 -> score = 25  (half average)
  // ratio = 0.25 -> score = 0  (quarter average or less, capped)
  //
  // Formula: score = 50 + (log2(ratio) * 25)
  const rawScore = 50 + Math.log2(ratio) * 25;

  // Clamp to 0-100 range
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}
