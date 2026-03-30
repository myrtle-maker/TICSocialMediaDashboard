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
  // ID — various field names across API versions
  id?: string | number;
  id_str?: string;
  tweetId?: string | number;
  // Text
  full_text?: string;
  text?: string;
  fullText?: string;
  // Engagement counts — v1 and v2 field names
  likeCount?: number;
  like_count?: number;
  favorite_count?: number;
  replyCount?: number;
  reply_count?: number;
  retweetCount?: number;
  retweet_count?: number;
  quoteCount?: number;
  quote_count?: number;
  bookmarkCount?: number;
  bookmark_count?: number;
  // Views — Twitter only exposes this for recent tweets
  viewCount?: number;
  view_count?: number;
  impressionCount?: number;
  // Timestamps
  createdAt?: string;
  created_at?: string;
  // URLs
  url?: string;
  tweetUrl?: string;
  permanentUrl?: string;
  entities?: {
    media?: { media_url_https?: string; type?: string }[];
    hashtags?: { text: string }[];
    user_mentions?: { screen_name: string }[];
  };
  author?: {
    id?: string;
    userName?: string;
    username?: string;
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
    const caption = raw.full_text ?? raw.fullText ?? raw.text ?? "";
    const likes = raw.likeCount ?? raw.like_count ?? raw.favorite_count ?? 0;
    const comments = raw.replyCount ?? raw.reply_count ?? 0;
    const retweets = raw.retweetCount ?? raw.retweet_count ?? 0;
    const quotes = raw.quoteCount ?? raw.quote_count ?? 0;
    const shares = retweets + quotes;
    const saves = raw.bookmarkCount ?? raw.bookmark_count ?? 0;
    const views = raw.viewCount ?? raw.view_count ?? raw.impressionCount ?? 0;

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

    const platformPostId = raw.id_str ?? String(raw.tweetId ?? raw.id ?? "") || generateId();
    const authorHandle =
      raw.author?.userName ?? raw.author?.username ?? raw.user?.screen_name ?? "";
    const permalink =
      raw.tweetUrl ??
      raw.permanentUrl ??
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
