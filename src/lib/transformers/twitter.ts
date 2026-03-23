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

interface TwitterRawPost {
  id?: string;
  id_str?: string;
  full_text?: string;
  text?: string;
  likeCount?: number;
  favorite_count?: number;
  replyCount?: number;
  retweetCount?: number;
  retweet_count?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
  createdAt?: string;
  created_at?: string;
  url?: string;
  tweetUrl?: string;
  entities?: {
    media?: { media_url_https?: string; type?: string }[];
    hashtags?: { text: string }[];
    user_mentions?: { screen_name: string }[];
  };
  author?: {
    id?: string;
    userName?: string;
    name?: string;
  };
  user?: {
    id_str?: string;
    screen_name?: string;
    name?: string;
  };
  [key: string]: unknown;
}

function getHookText(text: string): string {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 150);
}

function resolveContentType(raw: TwitterRawPost): ContentType {
  const media = raw.entities?.media;
  if (media && media.length > 0) {
    const firstType = media[0].type?.toLowerCase();
    if (firstType === "video" || firstType === "animated_gif") return "video";
    if (media.length > 1) return "carousel";
    return "image";
  }
  return "text";
}

export function transformTwitter(
  rawPosts: TwitterRawPost[],
  accountId: string,
  avgEngagementRate?: number
): SocialPost[] {
  const now = new Date();

  return rawPosts.map((raw) => {
    const caption = raw.full_text ?? raw.text ?? "";
    const likes = raw.likeCount ?? raw.favorite_count ?? 0;
    const comments = raw.replyCount ?? 0;
    const retweets = raw.retweetCount ?? raw.retweet_count ?? 0;
    const quotes = raw.quoteCount ?? 0;
    const shares = retweets + quotes;
    const saves = raw.bookmarkCount ?? 0;
    const views = raw.viewCount ?? 0;

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

    const platformPostId = raw.id_str ?? raw.id ?? generateId();
    const authorHandle =
      raw.author?.userName ?? raw.user?.screen_name ?? "";
    const permalink =
      raw.tweetUrl ??
      raw.url ??
      `https://twitter.com/${authorHandle}/status/${platformPostId}`;

    const mediaUrls: string[] =
      raw.entities?.media
        ?.map((m) => m.media_url_https)
        .filter((u): u is string => !!u) ?? [];

    const hashtags =
      raw.entities?.hashtags?.map((h) => `#${h.text.toLowerCase()}`) ??
      extractHashtags(caption);

    const mentions =
      raw.entities?.user_mentions?.map(
        (m) => `@${m.screen_name.toLowerCase()}`
      ) ?? extractMentions(caption);

    return {
      id: generateId(),
      platformPostId,
      platform: "twitter",
      accountId,

      contentType: resolveContentType(raw),
      caption,
      hashtags,
      mentions,
      mediaUrls,
      thumbnailUrl: mediaUrls[0] ?? null,
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
        authorId: raw.author?.id ?? raw.user?.id_str,
        authorHandle,
        authorName: raw.author?.name ?? raw.user?.name,
        retweetCount: retweets,
        quoteCount: quotes,
      },

      publishedAt: raw.createdAt
        ? new Date(raw.createdAt)
        : raw.created_at
          ? new Date(raw.created_at)
          : now,
      scrapedAt: now,
    };
  });
}
