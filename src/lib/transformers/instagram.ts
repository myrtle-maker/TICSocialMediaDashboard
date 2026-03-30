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

interface InstagramRawPost {
  id?: string;
  shortCode?: string;
  caption?: string;
  type?: string;
  // likes — various field names across scraper versions
  likesCount?: number;
  likes?: number;
  // comments
  commentsCount?: number;
  comments?: number;
  // views — various field names across scraper versions
  videoViewCount?: number;
  videoPlayCount?: number;
  playCount?: number;
  viewsCount?: number;
  displayUrl?: string;
  url?: string;
  images?: string[];
  videoUrl?: string;
  timestamp?: string;
  takenAt?: string;
  ownerUsername?: string;
  ownerId?: string;
  hashtags?: string[];
  mentions?: string[];
  dimensionsHeight?: number;
  dimensionsWidth?: number;
  [key: string]: unknown;
}

function getHookText(caption: string): string {
  const firstSentence = caption.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: InstagramRawPost): ContentType {
  const type = raw.type?.toLowerCase() ?? "";
  // Handle Graph API type names (GraphVideo, GraphSidecar, GraphImage)
  // and plain names (video, reel, sidecar, carousel, image)
  if (type.includes("video") || type === "reel") return "reel";
  if (type.includes("sidecar") || type.includes("carousel")) return "carousel";
  if (type === "story") return "story";
  if (raw.videoUrl) return "reel";
  return "image";
}

export function transformInstagram(
  rawPosts: InstagramRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const caption = raw.caption ?? "";
    const likes = raw.likesCount ?? raw.likes ?? 0;
    const comments = raw.commentsCount ?? raw.comments ?? 0;
    const shares = 0; // Instagram API does not expose shares
    const saves = 0; // Instagram API does not expose saves publicly
    const contentType = resolveContentType(raw);
    // Try all known view count field names across scraper versions
    const views =
      contentType === "reel" || contentType === "video"
        ? (raw.videoViewCount ?? raw.videoPlayCount ?? raw.playCount ?? raw.viewsCount ?? 0)
        : 0;

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

    const platformPostId = raw.shortCode ?? raw.id ?? generateId();
    const permalink =
      raw.url ?? `https://www.instagram.com/p/${platformPostId}/`;

    const mediaUrls: string[] = [];
    if (raw.displayUrl) mediaUrls.push(raw.displayUrl);
    if (raw.images) mediaUrls.push(...raw.images);
    if (raw.videoUrl) mediaUrls.push(raw.videoUrl);

    return {
      id: generateId(),
      platformPostId,
      platform: "instagram",
      accountId,

      contentType,
      caption,
      hashtags:
        raw.hashtags?.map((h) =>
          h.startsWith("#") ? h.toLowerCase() : `#${h.toLowerCase()}`
        ) ?? extractHashtags(caption),
      mentions:
        raw.mentions?.map((m) =>
          m.startsWith("@") ? m.toLowerCase() : `@${m.toLowerCase()}`
        ) ?? extractMentions(caption),
      mediaUrls,
      thumbnailUrl: raw.displayUrl ?? null,
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
        ownerUsername: raw.ownerUsername,
        ownerId: raw.ownerId,
        dimensions: raw.dimensionsHeight
          ? { height: raw.dimensionsHeight, width: raw.dimensionsWidth }
          : undefined,
      },

      publishedAt: raw.timestamp ? new Date(raw.timestamp) : raw.takenAt ? new Date(raw.takenAt) : now,
      scrapedAt: now,
    };
  });
}
