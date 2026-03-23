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

interface FacebookRawPost {
  postId?: string;
  postUrl?: string;
  url?: string;
  text?: string;
  time?: string;
  timestamp?: string;
  reactions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  media?: { thumbnail?: string; url?: string; type?: string }[];
  images?: string[];
  videoUrl?: string;
  pageName?: string;
  pageId?: string;
  type?: string;
  [key: string]: unknown;
}

function getHookText(text: string): string {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: FacebookRawPost): ContentType {
  const type = raw.type?.toLowerCase() ?? "";
  if (type === "video" || raw.videoUrl) return "video";
  if (type === "live_video") return "live";
  if (
    (raw.images && raw.images.length > 1) ||
    (raw.media && raw.media.length > 1)
  )
    return "carousel";
  if (
    type === "photo" ||
    (raw.images && raw.images.length === 1) ||
    (raw.media && raw.media.length === 1)
  )
    return "image";
  return "text";
}

export function transformFacebook(
  rawPosts: FacebookRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const caption = raw.text ?? "";
    const likes = raw.reactions ?? raw.likes ?? 0;
    const comments = raw.comments ?? 0;
    const shares = raw.shares ?? 0;
    const saves = 0;
    const views = raw.views ?? 0;

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

    const platformPostId = raw.postId ?? generateId();
    const permalink = raw.postUrl ?? raw.url ?? "";

    const mediaUrls: string[] = [];
    if (raw.images) mediaUrls.push(...raw.images);
    if (raw.videoUrl) mediaUrls.push(raw.videoUrl);
    if (raw.media) {
      for (const m of raw.media) {
        if (m.url) mediaUrls.push(m.url);
      }
    }

    const thumbnailUrl =
      raw.media?.[0]?.thumbnail ?? raw.images?.[0] ?? null;

    return {
      id: generateId(),
      platformPostId,
      platform: "facebook",
      accountId,

      contentType: resolveContentType(raw),
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      mediaUrls,
      thumbnailUrl,
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
        pageName: raw.pageName,
        pageId: raw.pageId,
        postType: raw.type,
      },

      publishedAt: raw.time
        ? new Date(raw.time)
        : raw.timestamp
          ? new Date(raw.timestamp)
          : now,
      scrapedAt: now,
    };
  });
}
