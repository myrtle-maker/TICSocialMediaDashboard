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

interface YouTubeRawPost {
  id?: string;
  videoId?: string;
  title?: string;
  description?: string;
  text?: string;
  likes?: number;
  dislikes?: number;
  commentsCount?: number;
  viewCount?: number;
  date?: string;
  uploadDate?: string;
  url?: string;
  thumbnailUrl?: string;
  channelName?: string;
  channelId?: string;
  channelUrl?: string;
  duration?: string;
  isShort?: boolean;
  isLive?: boolean;
  [key: string]: unknown;
}

function getHookText(title: string, description: string): string {
  // For YouTube, the title IS the hook
  if (title) return title.slice(0, 150);
  const firstSentence = description.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: YouTubeRawPost): ContentType {
  if (raw.isShort) return "short";
  if (raw.isLive) return "live";
  return "video";
}

export function transformYouTube(
  rawPosts: YouTubeRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const title = raw.title ?? "";
    const description = raw.description ?? raw.text ?? "";
    const caption = title + (description ? `\n${description}` : "");

    const likes = raw.likes ?? 0;
    const comments = raw.commentsCount ?? 0;
    const shares = 0; // YouTube API does not expose shares
    const saves = 0;
    const views = raw.viewCount ?? 0;

    const engagementRate = calculateEngagementRate(
      likes,
      comments,
      shares,
      saves,
      views
    );
    const viralityScore = calculateViralityScore(shares, views);
    const hookText = getHookText(title, description);
    const hookType = classifyHook(caption);
    const hookScore = scoreHook(engagementRate, avgEngagementRate);

    const platformPostId = raw.videoId ?? raw.id ?? generateId();
    const permalink =
      raw.url ?? `https://www.youtube.com/watch?v=${platformPostId}`;

    const mediaUrls: string[] = [];
    if (raw.thumbnailUrl) mediaUrls.push(raw.thumbnailUrl);

    return {
      id: generateId(),
      platformPostId,
      platform: "youtube",
      accountId,

      contentType: resolveContentType(raw),
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      mediaUrls,
      thumbnailUrl: raw.thumbnailUrl ?? null,
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
        channelName: raw.channelName,
        channelId: raw.channelId,
        channelUrl: raw.channelUrl,
        duration: raw.duration,
        dislikes: raw.dislikes,
      },

      publishedAt: raw.date
        ? new Date(raw.date)
        : raw.uploadDate
          ? new Date(raw.uploadDate)
          : now,
      scrapedAt: now,
    };
  });
}
