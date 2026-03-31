import type { Platform, ContentType, HookType } from "@/types/social";

// ---- Platform Configuration ----

export const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  tiktok: {
    label: "TikTok",
    color: "var(--platform-tiktok)",
    bgColor: "var(--platform-tiktok-bg)",
    icon: "music",
  },
  instagram: {
    label: "Instagram",
    color: "var(--platform-instagram)",
    bgColor: "var(--platform-instagram-bg)",
    icon: "camera",
  },
  youtube: {
    label: "YouTube",
    color: "var(--platform-youtube)",
    bgColor: "var(--platform-youtube-bg)",
    icon: "play",
  },
  twitter: {
    label: "X / Twitter",
    color: "var(--platform-twitter)",
    bgColor: "var(--platform-twitter-bg)",
    icon: "at-sign",
  },
  facebook: {
    label: "Facebook",
    color: "var(--platform-facebook)",
    bgColor: "var(--platform-facebook-bg)",
    icon: "thumbs-up",
  },
  linkedin: {
    label: "LinkedIn",
    color: "var(--platform-linkedin)",
    bgColor: "var(--platform-linkedin-bg)",
    icon: "briefcase",
  },
};

export const PLATFORMS: Platform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "twitter",
  "facebook",
  "linkedin",
];

// ---- Content Types ----

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: "Video",
  image: "Image",
  carousel: "Carousel",
  text: "Text",
  reel: "Reel",
  short: "Short",
  story: "Story",
  live: "Live",
};

// ---- Hook Types ----

export const HOOK_TYPE_LABELS: Record<HookType, string> = {
  question: "Question",
  statistic: "Statistic",
  controversy: "Controversy",
  story: "Story",
  cta: "Call to Action",
  trend: "Trend",
  educational: "Educational",
  emotional: "Emotional",
  other: "Other",
};

export const HOOK_TYPE_COLORS: Record<HookType, string> = {
  question: "#3b82f6",
  statistic: "#10b981",
  controversy: "#ef4444",
  story: "#8b5cf6",
  cta: "#f59e0b",
  trend: "#ec4899",
  educational: "#06b6d4",
  emotional: "#f97316",
  other: "#6b7280",
};

// ---- Sort Options ----

export const SORT_OPTIONS = [
  { value: "publishedAt", label: "Date Published" },
  { value: "engagementRate", label: "Engagement Rate" },
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "shares", label: "Shares" },
  { value: "saves", label: "Saves / Bookmarks" },
  { value: "viralityScore", label: "Virality Score" },
  { value: "hookScore", label: "Hook Score" },
] as const;

// ---- Metric Tooltips ----

export const METRIC_TOOLTIPS: Record<string, string> = {
  engagementRate:
    "The percentage of viewers who interacted with this post (likes + comments + shares + saves) divided by total views.",
  viralityScore:
    "How likely this post is to be shared. Calculated as shares divided by views, multiplied by 100.",
  hookScore:
    "How well this post's opening hook performed compared to the account's average. 50 = average, above 50 = better than average.",
  impressions:
    "The total number of times this post was shown to users, including repeat views.",
  reach:
    "The number of unique users who saw this post at least once.",
  saves:
    "The number of times users saved or bookmarked this post for later.",
  shares:
    "The number of times this post was shared, retweeted, or reposted.",
};

// ---- Apify Actor IDs ----

export const APIFY_ACTORS: Record<Platform, { id: string; label: string }> = {
  tiktok: { id: "clockworks/tiktok-scraper", label: "TikTok Scraper" },
  instagram: { id: "apify/instagram-scraper", label: "Instagram Scraper" },
  youtube: { id: "streamers/youtube-scraper", label: "YouTube Scraper" },
  twitter: { id: "apidojo/tweet-scraper", label: "Tweet Scraper V2" },
  facebook: {
    id: "apify/facebook-posts-scraper",
    label: "Facebook Posts Scraper",
  },
  linkedin: {
    id: "scraper-engine/linkedin-company-post-scraper",
    label: "LinkedIn Company Post Scraper",
  },
};

// ---- Navigation ----

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "layout-dashboard" },
  { href: "/platforms", label: "Platforms", icon: "grid-3x3" },
  { href: "/content", label: "Content", icon: "bar-chart-3" },
  { href: "/hooks", label: "Hooks", icon: "zap" },
  { href: "/audience", label: "Audience", icon: "users" },
  { href: "/accounts", label: "Accounts", icon: "settings" },
  { href: "/settings", label: "Settings", icon: "sliders-horizontal" },
] as const;

// ---- Default Filters ----

export const DEFAULT_FILTERS = {
  platforms: [] as Platform[],
  contentTypes: [] as ContentType[],
  dateRange: null,
  accounts: [] as string[],
  hookTypes: [] as HookType[],
  minEngagementRate: null,
  minViews: null,
  hashtags: [] as string[],
  sortBy: "publishedAt" as const,
  sortOrder: "desc" as const,
  searchQuery: "",
};
