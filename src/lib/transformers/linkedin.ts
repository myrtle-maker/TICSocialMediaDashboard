import type { SocialPost, ContentType } from "@/types/social";
import {
  extractHashtags,
  extractMentions,
  calculateEngagementRate,
  calculateViralityScore,
  generateId,
} from "@/lib/utils";
import { classifyHook } from "@/lib/hooks/classifier";
import { scoreHook } from "@/lib/hooks/scorer";

interface LinkedInRawPost {
  urn?: string;
  postId?: string;
  postUrl?: string;
  text?: string;
  numLikes?: number;
  numComments?: number;
  numShares?: number;
  numImpressions?: number;
  postedAt?: string;
  postedDate?: string;
  images?: string[];
  videoUrl?: string;
  articleUrl?: string;
  companyName?: string;
  companyId?: string;
  companyUrl?: string;
  type?: string;
  [key: string]: unknown;
}

function getHookText(text: string): string {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: LinkedInRawPost): ContentType {
  const type = raw.type?.toLowerCase() ?? "";
  if (type === "video" || raw.videoUrl) return "video";
  if (raw.images && raw.images.length > 1) return "carousel";
  if (raw.images && raw.images.length === 1) return "image";
  if (raw.articleUrl) return "text"; // Link shares treated as text
  return "text";
}

export function transformLinkedIn(
  rawPosts: LinkedInRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const caption = raw.text ?? "";
    const likes = raw.numLikes ?? 0;
    const comments = raw.numComments ?? 0;
    const shares = raw.numShares ?? 0;
    const saves = 0;
    const views = raw.numImpressions ?? 0;

    const engagementRate = calculateEngagementRate(
      likes,
      comments,
      shares,
      saves,
      views
    );
    const viralityScore = calculateViralityScore(shares, views);
    const hookText = getHookText(caption);
    const hookType = classifyHook(caption);
    const hookScore = scoreHook(engagementRate, avgEngagementRate);

    const platformPostId = raw.postId ?? raw.urn ?? generateId();
    const permalink = raw.postUrl ?? "";

    const mediaUrls: string[] = [];
    if (raw.images) mediaUrls.push(...raw.images);
    if (raw.videoUrl) mediaUrls.push(raw.videoUrl);

    return {
      id: generateId(),
      platformPostId,
      platform: "linkedin",
      accountId,

      contentType: resolveContentType(raw),
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      mediaUrls,
      thumbnailUrl: raw.images?.[0] ?? null,
      permalink,

      hookText,
      hookType,
      hookScore,

      likes,
      comments,
      shares,
      saves,
      views,
      impressions: raw.numImpressions ?? null,
      reach: null,

      engagementRate,
      viralityScore,

      platformMeta: {
        companyName: raw.companyName,
        companyId: raw.companyId,
        companyUrl: raw.companyUrl,
        articleUrl: raw.articleUrl,
        urn: raw.urn,
      },

      publishedAt: raw.postedAt
        ? new Date(raw.postedAt)
        : raw.postedDate
          ? new Date(raw.postedDate)
          : now,
      scrapedAt: now,
    };
  });
}
