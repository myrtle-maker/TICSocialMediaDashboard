// ---- Core Enums ----

export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "facebook" | "linkedin";

export type ContentType = "video" | "image" | "carousel" | "text" | "reel" | "short" | "story" | "live";

export type HookType =
  | "question"
  | "statistic"
  | "controversy"
  | "story"
  | "cta"
  | "trend"
  | "educational"
  | "emotional"
  | "other";

// ---- Post-Level Schema ----

export interface SocialPost {
  id: string;
  platformPostId: string;
  platform: Platform;
  accountId: string;

  // Content
  contentType: ContentType;
  caption: string;
  hashtags: string[];
  mentions: string[];
  mediaUrls: string[];
  thumbnailUrl: string | null;
  permalink: string;

  // Hook Analysis
  hookText: string;
  hookType: HookType;
  hookScore: number;

  // Engagement Metrics
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  impressions: number | null;
  reach: number | null;

  // Computed Metrics
  engagementRate: number;
  viralityScore: number;

  // Platform-Specific overflow
  platformMeta: Record<string, unknown>;

  // Timestamps
  publishedAt: Date;
  scrapedAt: Date;
}

// ---- Account-Level Schema ----

export interface SocialAccount {
  id: string;
  platform: Platform;
  platformAccountId: string;
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
  bio: string | null;

  followers: number;
  following: number;
  totalPosts: number;

  verified: boolean;
  accountType: "personal" | "business" | "creator";
  category: string | null;
  externalUrl: string | null;

  lastScrapedAt: Date | null;
  createdAt: Date;
}

// ---- Audience Demographics ----

export interface AudienceDemographics {
  accountId: string;
  platform: Platform;

  topCountries: { country: string; percentage: number }[];
  topCities: { city: string; percentage: number }[];
  genderSplit: { male: number; female: number; other: number } | null;
  ageRanges: { range: string; percentage: number }[] | null;
  activeHours: { hour: number; engagementIndex: number }[];
  activeDays: { day: string; engagementIndex: number }[];

  estimatedAt: Date;
}

// ---- Scrape Job ----

export interface ScrapeJob {
  id: string;
  platform: Platform;
  accountId: string;
  apifyRunId: string;
  apifyActorId: string;
  status: "pending" | "running" | "succeeded" | "failed";
  postsScraped: number;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

// ---- Filter/Query Types ----

export interface PostFilters {
  platforms: Platform[];
  contentTypes: ContentType[];
  dateRange: { from: Date; to: Date } | null;
  accounts: string[];
  hookTypes: HookType[];
  minEngagementRate: number | null;
  minViews: number | null;
  hashtags: string[];
  sortBy:
    | "publishedAt"
    | "engagementRate"
    | "views"
    | "likes"
    | "shares"
    | "saves"
    | "viralityScore"
    | "hookScore";
  sortOrder: "asc" | "desc";
  searchQuery: string;
}

// ---- KPI Types ----

export interface KpiData {
  totalPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalSaves: number;
  totalComments: number;
  platformBreakdown: { platform: Platform; posts: number; engagement: number; views: number; avgEngagementRate: number }[];
  topPost: SocialPost | null;
}

export interface TrendDataPoint {
  date: string;
  posts: number;
  engagement: number;
  views: number;
  engagementRate: number;
}

// ---- Hook Analysis Types ----

export interface HookAnalysis {
  hookType: HookType;
  postCount: number;
  avgEngagementRate: number;
  avgViews: number;
  avgLikes: number;
  avgShares: number;
  topPosts: SocialPost[];
}

// ---- Content Analysis Types ----

export interface ContentTypeAnalysis {
  contentType: ContentType;
  postCount: number;
  avgEngagementRate: number;
  avgViews: number;
  totalEngagement: number;
}

export interface PostingTimeHeatmap {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  avgEngagementRate: number;
  postCount: number;
}

export interface HashtagPerformance {
  hashtag: string;
  postCount: number;
  avgEngagementRate: number;
  totalViews: number;
}
