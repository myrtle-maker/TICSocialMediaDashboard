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

interface TikTokRawPost {
  id?: string;
  text?: string;
  desc?: string;
  createTime?: number;
  createTimeISO?: string;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
  playCount?: number;
  videoUrl?: string;
  webVideoUrl?: string;
  imageUrl?: string;
  coverUrl?: string;
  authorMeta?: {
    id?: string;
    name?: string;
    nickName?: string;
  };
  hashtags?: { name: string }[];
  isSlideshow?: boolean;
  [key: string]: unknown;
}

function getHookText(caption: string): string {
  // First sentence or first 150 characters
  const firstSentence = caption.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: TikTokRawPost): ContentType {
  if (raw.isSlideshow) return "carousel";
  return "video";
}

export function transformTikTok(
  rawPosts: TikTokRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const caption = raw.text ?? raw.desc ?? "";
    const likes = raw.diggCount ?? 0;
    const comments = raw.commentCount ?? 0;
    const shares = raw.shareCount ?? 0;
    const saves = raw.collectCount ?? 0;
    const views = raw.playCount ?? 0;

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

    const platformPostId = raw.id ?? generateId();
    const permalink =
      raw.webVideoUrl ??
      `https://www.tiktok.com/@${raw.authorMeta?.name ?? ""}/video/${platformPostId}`;

    const mediaUrls: string[] = [];
    if (raw.videoUrl) mediaUrls.push(raw.videoUrl);

    const hashtags =
      raw.hashtags?.map((h) => `#${h.name.toLowerCase()}`) ??
      extractHashtags(caption);

    return {
      id: generateId(),
      platformPostId,
      platform: "tiktok",
      accountId,

      contentType: resolveContentType(raw),
      caption,
      hashtags,
      mentions: extractMentions(caption),
      mediaUrls,
      thumbnailUrl: raw.coverUrl ?? raw.imageUrl ?? null,
      permalink,

      hookText,
      hookType,
      hookScore,

      likes,
      comments,
      shares,
      saves,
      views,
      impressions: null,
      reach: null,

      engagementRate,
      viralityScore,

      platformMeta: {
        authorId: raw.authorMeta?.id,
        authorName: raw.authorMeta?.name,
        authorNickName: raw.authorMeta?.nickName,
      },

      publishedAt: raw.createTimeISO
        ? new Date(raw.createTimeISO)
        : raw.createTime
          ? new Date(raw.createTime * 1000)
          : now,
      scrapedAt: now,
    };
  });
}
