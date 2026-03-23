import type {
  SocialAccount,
  SocialPost,
  Platform,
  ContentType,
  HookType,
} from "@/types/social";
import {
  calculateEngagementRate,
  calculateViralityScore,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function seedId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter.toString().padStart(4, "0")}`;
}

/** Return a Date that is `daysAgo` days before "now" with a random hour. */
function daysAgo(d: number, hour?: number): Date {
  const base = new Date("2026-03-22T12:00:00Z");
  const dt = new Date(base);
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour ?? Math.floor(Math.random() * 14) + 8); // 08-22
  dt.setMinutes(Math.floor(Math.random() * 60));
  return dt;
}

const NOW = new Date("2026-03-22T12:00:00Z");

// ---------------------------------------------------------------------------
// Seed Accounts
// ---------------------------------------------------------------------------

export const seedAccounts: SocialAccount[] = [
  {
    id: "acct_tiktok",
    platform: "tiktok",
    platformAccountId: "7192837465",
    handle: "@ticinvestments",
    displayName: "TIC Investments",
    profileImageUrl: null,
    bio: "Empowering wealth through insight. Follow for market analysis & tips.",
    followers: 284_500,
    following: 312,
    totalPosts: 487,
    verified: true,
    accountType: "business",
    category: "Finance",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2023-06-15"),
  },
  {
    id: "acct_instagram",
    platform: "instagram",
    platformAccountId: "56019283746",
    handle: "@ticinvestments",
    displayName: "TIC Investments",
    profileImageUrl: null,
    bio: "Investment insights & market trends | Wealth management that works",
    followers: 175_200,
    following: 485,
    totalPosts: 612,
    verified: true,
    accountType: "business",
    category: "Finance",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2022-01-10"),
  },
  {
    id: "acct_youtube",
    platform: "youtube",
    platformAccountId: "UC_tic_invest",
    handle: "@TICInvestments",
    displayName: "TIC Investments",
    profileImageUrl: null,
    bio: "Weekly deep dives into global markets, portfolio strategy, and wealth building.",
    followers: 92_300,
    following: 28,
    totalPosts: 214,
    verified: true,
    accountType: "business",
    category: "Finance & Investing",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2021-09-01"),
  },
  {
    id: "acct_twitter",
    platform: "twitter",
    platformAccountId: "1498273645",
    handle: "@TIC_Invest",
    displayName: "TIC Investments",
    profileImageUrl: null,
    bio: "Real-time market commentary & macro insights.",
    followers: 63_800,
    following: 1_204,
    totalPosts: 3_921,
    verified: true,
    accountType: "business",
    category: "Finance",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2020-03-22"),
  },
  {
    id: "acct_facebook",
    platform: "facebook",
    platformAccountId: "107293846512",
    handle: "TICInvestments",
    displayName: "TIC Investments",
    profileImageUrl: null,
    bio: "Your partner in smart investing. Community-first financial education.",
    followers: 48_100,
    following: 215,
    totalPosts: 890,
    verified: false,
    accountType: "business",
    category: "Financial Services",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2019-11-05"),
  },
  {
    id: "acct_linkedin",
    platform: "linkedin",
    platformAccountId: "tic-investments-ltd",
    handle: "tic-investments-ltd",
    displayName: "TIC Investments Ltd",
    profileImageUrl: null,
    bio: "Institutional-grade research for every investor. Follow for thought leadership.",
    followers: 31_400,
    following: 620,
    totalPosts: 345,
    verified: false,
    accountType: "business",
    category: "Financial Services",
    externalUrl: "https://ticinvestments.com",
    lastScrapedAt: NOW,
    createdAt: new Date("2020-07-18"),
  },
];

// ---------------------------------------------------------------------------
// Post Factory
// ---------------------------------------------------------------------------

interface PostSeed {
  platform: Platform;
  accountId: string;
  contentType: ContentType;
  caption: string;
  hookText: string;
  hookType: HookType;
  hookScore: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  daysAgo: number;
  hour?: number;
}

function makePost(s: PostSeed): SocialPost {
  const hashtags = (s.caption.match(/#[\w]+/g) ?? []).map((h) => h.toLowerCase());
  const mentions = (s.caption.match(/@[\w.]+/g) ?? []).map((m) => m.toLowerCase());
  const er = calculateEngagementRate(s.likes, s.comments, s.shares, s.saves, s.views);
  const vs = calculateViralityScore(s.shares, s.views);
  const pubDate = daysAgo(s.daysAgo, s.hour);

  return {
    id: seedId("post"),
    platformPostId: `pp_${Math.random().toString(36).slice(2, 10)}`,
    platform: s.platform,
    accountId: s.accountId,
    contentType: s.contentType,
    caption: s.caption,
    hashtags,
    mentions,
    mediaUrls: [],
    thumbnailUrl: null,
    permalink: `https://${s.platform}.com/p/${Math.random().toString(36).slice(2, 10)}`,
    hookText: s.hookText,
    hookType: s.hookType,
    hookScore: s.hookScore,
    likes: s.likes,
    comments: s.comments,
    shares: s.shares,
    saves: s.saves,
    views: s.views,
    impressions: Math.round(s.views * (1.1 + Math.random() * 0.3)),
    reach: Math.round(s.views * (0.85 + Math.random() * 0.15)),
    engagementRate: er,
    viralityScore: vs,
    platformMeta: {},
    publishedAt: pubDate,
    scrapedAt: NOW,
  };
}

// ---------------------------------------------------------------------------
// TikTok Posts (10)
// ---------------------------------------------------------------------------

const tiktokPosts: PostSeed[] = [
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "POV: You just discovered compound interest at 25 #investing #compoundinterest #wealthbuilding #financetips",
    hookText: "POV: You just discovered compound interest at 25",
    hookType: "story", hookScore: 88,
    likes: 42_300, comments: 1_820, shares: 8_540, saves: 12_100, views: 1_250_000,
    daysAgo: 2, hour: 19,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "Why 90% of day traders lose money (the math is brutal) #daytrading #stockmarket #investing101",
    hookText: "Why 90% of day traders lose money",
    hookType: "statistic", hookScore: 92,
    likes: 89_600, comments: 4_210, shares: 22_100, saves: 18_300, views: 3_400_000,
    daysAgo: 5, hour: 12,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "Is the housing market about to crash? Here's what the data says #realestate #housingmarket #economy",
    hookText: "Is the housing market about to crash?",
    hookType: "question", hookScore: 85,
    likes: 31_200, comments: 2_950, shares: 6_300, saves: 7_800, views: 980_000,
    daysAgo: 8, hour: 18,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "The ETF trick nobody talks about #etf #passiveincome #investing #stocktips",
    hookText: "The ETF trick nobody talks about",
    hookType: "controversy", hookScore: 78,
    likes: 18_400, comments: 920, shares: 3_200, saves: 5_600, views: 640_000,
    daysAgo: 11, hour: 20,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "I turned $500 into $12,000 in 18 months. Here's the exact strategy. #investing #stockmarket #wealthbuilding",
    hookText: "I turned $500 into $12,000 in 18 months",
    hookType: "story", hookScore: 95,
    likes: 124_500, comments: 6_800, shares: 34_200, saves: 41_000, views: 5_800_000,
    daysAgo: 14, hour: 17,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "3 red flags that your financial advisor is ripping you off #financialadvisor #moneytips #personalfinance",
    hookText: "3 red flags your financial advisor is ripping you off",
    hookType: "educational", hookScore: 82,
    likes: 22_100, comments: 1_430, shares: 5_800, saves: 9_200, views: 810_000,
    daysAgo: 17, hour: 13,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "This recession indicator just flashed red #recession #economy #investing #markets",
    hookText: "This recession indicator just flashed red",
    hookType: "trend", hookScore: 80,
    likes: 15_800, comments: 1_100, shares: 4_100, saves: 3_200, views: 520_000,
    daysAgo: 20, hour: 15,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "Stop saving money. Seriously. #moneytips #investing #financialliteracy",
    hookText: "Stop saving money. Seriously.",
    hookType: "controversy", hookScore: 90,
    likes: 67_200, comments: 5_300, shares: 15_600, saves: 11_400, views: 2_100_000,
    daysAgo: 22, hour: 11,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "What would you do with a $10K windfall? Comment below! #investing #personalfinance #money",
    hookText: "What would you do with a $10K windfall?",
    hookType: "cta", hookScore: 72,
    likes: 9_400, comments: 2_800, shares: 1_200, saves: 2_100, views: 340_000,
    daysAgo: 25, hour: 16,
  },
  {
    platform: "tiktok", accountId: "acct_tiktok", contentType: "video",
    caption: "The emotional rollercoaster of watching your portfolio drop 20% #investing #stockmarket #mentalhealth",
    hookText: "The emotional rollercoaster of watching your portfolio drop 20%",
    hookType: "emotional", hookScore: 76,
    likes: 28_700, comments: 1_650, shares: 7_300, saves: 4_800, views: 890_000,
    daysAgo: 28, hour: 21,
  },
];

// ---------------------------------------------------------------------------
// Instagram Posts (10)
// ---------------------------------------------------------------------------

const instagramPosts: PostSeed[] = [
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "reel",
    caption: "The 50/30/20 rule is dead. Here's what replaced it. #budgeting #personalfinance #moneyrules #financetips",
    hookText: "The 50/30/20 rule is dead",
    hookType: "controversy", hookScore: 87,
    likes: 14_800, comments: 620, shares: 3_100, saves: 8_900, views: 410_000,
    daysAgo: 1, hour: 10,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "carousel",
    caption: "Swipe to see the 7 assets that build generational wealth (save this!) #wealthbuilding #assets #investing #financialfreedom",
    hookText: "7 assets that build generational wealth",
    hookType: "educational", hookScore: 91,
    likes: 22_400, comments: 890, shares: 4_200, saves: 15_600, views: 320_000,
    daysAgo: 3, hour: 9,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "reel",
    caption: "How I explained the stock market to my 8-year-old niece #investing101 #stockmarket #financialeducation",
    hookText: "How I explained the stock market to my 8-year-old niece",
    hookType: "story", hookScore: 84,
    likes: 18_200, comments: 1_040, shares: 5_600, saves: 7_200, views: 480_000,
    daysAgo: 6, hour: 18,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "image",
    caption: "Your net worth at 30 vs 40 if you start investing NOW. The difference is staggering. #compoundinterest #investing #networth",
    hookText: "Your net worth at 30 vs 40 if you start investing NOW",
    hookType: "statistic", hookScore: 79,
    likes: 8_600, comments: 340, shares: 1_800, saves: 6_100, views: 145_000,
    daysAgo: 9, hour: 12,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "carousel",
    caption: "5 books that changed how I think about money forever #booktok #finance #personalfinance #moneybooks",
    hookText: "5 books that changed how I think about money",
    hookType: "educational", hookScore: 83,
    likes: 11_300, comments: 560, shares: 2_400, saves: 9_800, views: 198_000,
    daysAgo: 12, hour: 8,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "reel",
    caption: "Reacting to my worst investment decision ever (lost $22K) #investing #mistakes #moneylesson",
    hookText: "Reacting to my worst investment decision ever",
    hookType: "emotional", hookScore: 88,
    likes: 35_100, comments: 2_100, shares: 8_400, saves: 6_300, views: 720_000,
    daysAgo: 15, hour: 19,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "story",
    caption: "Quick poll: Bonds or REITs for passive income? Vote now! #investing #passiveincome #poll",
    hookText: "Bonds or REITs for passive income?",
    hookType: "cta", hookScore: 65,
    likes: 3_200, comments: 1_800, shares: 420, saves: 310, views: 62_000,
    daysAgo: 16, hour: 14,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "image",
    caption: "Monday motivation: Warren Buffett started with $114. Today he's worth $130B. #warrenbuffett #motivation #investing",
    hookText: "Warren Buffett started with $114",
    hookType: "statistic", hookScore: 73,
    likes: 6_800, comments: 210, shares: 1_500, saves: 2_800, views: 108_000,
    daysAgo: 19, hour: 7,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "reel",
    caption: "Dollar cost averaging explained in 60 seconds #dca #investing #beginnerinvestor",
    hookText: "Dollar cost averaging explained in 60 seconds",
    hookType: "educational", hookScore: 80,
    likes: 12_600, comments: 480, shares: 3_600, saves: 7_400, views: 295_000,
    daysAgo: 23, hour: 17,
  },
  {
    platform: "instagram", accountId: "acct_instagram", contentType: "carousel",
    caption: "The biggest financial trends reshaping 2026 #financetrends #economy #2026predictions #markets",
    hookText: "The biggest financial trends reshaping 2026",
    hookType: "trend", hookScore: 77,
    likes: 9_100, comments: 390, shares: 2_100, saves: 5_500, views: 172_000,
    daysAgo: 27, hour: 11,
  },
];

// ---------------------------------------------------------------------------
// YouTube Posts (10)
// ---------------------------------------------------------------------------

const youtubePosts: PostSeed[] = [
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "The FULL Beginner's Guide to Investing in 2026 (step by step) #investing #beginnerguide #2026",
    hookText: "The FULL beginner's guide to investing in 2026",
    hookType: "educational", hookScore: 93,
    likes: 8_400, comments: 1_240, shares: 2_800, saves: 4_100, views: 340_000,
    daysAgo: 1, hour: 14,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "short",
    caption: "Did you know the S&P 500 averages 10.5% per year? #shorts #investing #sp500",
    hookText: "The S&P 500 averages 10.5% per year",
    hookType: "statistic", hookScore: 74,
    likes: 5_200, comments: 310, shares: 1_400, saves: 980, views: 186_000,
    daysAgo: 4, hour: 16,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "I Analyzed 1,000 Portfolios. Here's What the Top 1% Do Differently. #portfolioanalysis #investing #wealthmanagement",
    hookText: "I analyzed 1,000 portfolios. Here's what the top 1% do differently.",
    hookType: "story", hookScore: 96,
    likes: 18_900, comments: 2_600, shares: 6_100, saves: 9_200, views: 820_000,
    daysAgo: 7, hour: 10,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "Why Gold Is Hitting All-Time Highs (And What It Means for You) #gold #commodities #investing",
    hookText: "Why gold is hitting all-time highs",
    hookType: "trend", hookScore: 81,
    likes: 6_100, comments: 820, shares: 1_900, saves: 2_300, views: 245_000,
    daysAgo: 10, hour: 12,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "short",
    caption: "The one ratio that predicts stock crashes #shorts #stockmarket #crashprediction",
    hookText: "The one ratio that predicts stock crashes",
    hookType: "controversy", hookScore: 86,
    likes: 11_800, comments: 680, shares: 3_400, saves: 2_100, views: 410_000,
    daysAgo: 13, hour: 15,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "How to Build a Dividend Portfolio That Pays You Monthly #dividends #passiveincome #investing",
    hookText: "Build a dividend portfolio that pays you monthly",
    hookType: "educational", hookScore: 89,
    likes: 14_300, comments: 1_860, shares: 4_500, saves: 7_600, views: 560_000,
    daysAgo: 16, hour: 9,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "My $500K Portfolio Reveal (Full Breakdown) #portfolioreveal #investing #transparency",
    hookText: "My $500K portfolio reveal",
    hookType: "story", hookScore: 91,
    likes: 21_400, comments: 3_100, shares: 5_800, saves: 8_400, views: 940_000,
    daysAgo: 19, hour: 11,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "short",
    caption: "Should you buy the dip? The honest answer. #shorts #buythedip #investing",
    hookText: "Should you buy the dip? The honest answer.",
    hookType: "question", hookScore: 77,
    likes: 4_600, comments: 420, shares: 1_100, saves: 780, views: 158_000,
    daysAgo: 21, hour: 20,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "video",
    caption: "I asked 5 billionaires their #1 investing rule #billionaires #investingrules #wisdom",
    hookText: "I asked 5 billionaires their #1 investing rule",
    hookType: "story", hookScore: 94,
    likes: 32_600, comments: 4_200, shares: 9_800, saves: 12_100, views: 1_480_000,
    daysAgo: 24, hour: 13,
  },
  {
    platform: "youtube", accountId: "acct_youtube", contentType: "live",
    caption: "LIVE: Q1 2026 Market Recap & Q2 Predictions #live #marketrecap #2026 #investing",
    hookText: "Q1 2026 market recap and Q2 predictions",
    hookType: "trend", hookScore: 70,
    likes: 2_800, comments: 1_640, shares: 620, saves: 410, views: 48_000,
    daysAgo: 29, hour: 18,
  },
];

// ---------------------------------------------------------------------------
// Twitter Posts (10)
// ---------------------------------------------------------------------------

const twitterPosts: PostSeed[] = [
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "Hot take: Index funds are the greatest wealth equalizer in history. Fight me. #investing #indexfunds",
    hookText: "Index funds are the greatest wealth equalizer in history",
    hookType: "controversy", hookScore: 84,
    likes: 4_200, comments: 890, shares: 2_100, saves: 640, views: 182_000,
    daysAgo: 1, hour: 8,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "Thread: 10 lessons from managing $50M in client assets (a thread) 1/ Diversification isn't just about stocks... #investing #wealthmanagement",
    hookText: "10 lessons from managing $50M in client assets",
    hookType: "educational", hookScore: 90,
    likes: 8_900, comments: 1_200, shares: 4_600, saves: 2_100, views: 320_000,
    daysAgo: 3, hour: 9,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "image",
    caption: "This chart shows why timing the market is a fool's errand. 20 years of data, one clear conclusion. #stockmarket #data",
    hookText: "This chart shows why timing the market is a fool's errand",
    hookType: "statistic", hookScore: 82,
    likes: 3_800, comments: 420, shares: 1_800, saves: 890, views: 145_000,
    daysAgo: 6, hour: 11,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "If you're under 35 and not investing at least 15% of your income, you're playing a dangerous game. #personalfinance #investing",
    hookText: "Under 35 and not investing 15%? You're playing a dangerous game.",
    hookType: "controversy", hookScore: 86,
    likes: 6_100, comments: 1_340, shares: 3_200, saves: 720, views: 248_000,
    daysAgo: 9, hour: 7,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "Breaking: Fed signals two more rate cuts in 2026. Here's how to position your portfolio. #federalreserve #rates #investing",
    hookText: "Fed signals two more rate cuts in 2026",
    hookType: "trend", hookScore: 88,
    likes: 7_400, comments: 680, shares: 4_100, saves: 1_200, views: 290_000,
    daysAgo: 12, hour: 14,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "What's the one stock you'd hold for 20 years? Reply below. #investing #longterm #stockpicks",
    hookText: "One stock you'd hold for 20 years?",
    hookType: "cta", hookScore: 71,
    likes: 2_900, comments: 3_400, shares: 860, saves: 310, views: 124_000,
    daysAgo: 14, hour: 16,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "Most people don't need a financial advisor. They need a spreadsheet and discipline. Controversial? Maybe. True? Absolutely. #finance",
    hookText: "Most people don't need a financial advisor",
    hookType: "controversy", hookScore: 83,
    likes: 5_600, comments: 1_860, shares: 2_400, saves: 580, views: 210_000,
    daysAgo: 18, hour: 10,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "image",
    caption: "A simple visual showing how $200/month grows over 30 years at different return rates. Save this. #compoundinterest #investing",
    hookText: "How $200/month grows over 30 years at different return rates",
    hookType: "educational", hookScore: 79,
    likes: 3_100, comments: 280, shares: 1_600, saves: 1_400, views: 98_000,
    daysAgo: 21, hour: 12,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "Unpopular opinion: Crypto is not an investment. It's a speculation vehicle. There's a huge difference. #crypto #bitcoin #investing",
    hookText: "Crypto is not an investment. It's a speculation vehicle.",
    hookType: "controversy", hookScore: 92,
    likes: 12_400, comments: 4_800, shares: 6_200, saves: 1_100, views: 580_000,
    daysAgo: 24, hour: 15,
  },
  {
    platform: "twitter", accountId: "acct_twitter", contentType: "text",
    caption: "The best time to invest was yesterday. The second best time is today. Stop waiting for the perfect moment. #motivation #investing",
    hookText: "The best time to invest was yesterday",
    hookType: "emotional", hookScore: 68,
    likes: 1_800, comments: 140, shares: 620, saves: 280, views: 64_000,
    daysAgo: 28, hour: 9,
  },
];

// ---------------------------------------------------------------------------
// Facebook Posts (10)
// ---------------------------------------------------------------------------

const facebookPosts: PostSeed[] = [
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "video",
    caption: "We sat down with a retired millionaire teacher to learn his investing secrets. You won't believe how simple it is. #investing #retirement #financialfreedom",
    hookText: "A retired millionaire teacher shares his investing secrets",
    hookType: "story", hookScore: 85,
    likes: 3_400, comments: 620, shares: 1_800, saves: 940, views: 89_000,
    daysAgo: 2, hour: 10,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "image",
    caption: "Inflation is quietly eating your savings. Here's what $100 from 2020 is worth today. #inflation #savings #economy",
    hookText: "Inflation is quietly eating your savings",
    hookType: "statistic", hookScore: 78,
    likes: 2_100, comments: 340, shares: 1_200, saves: 580, views: 54_000,
    daysAgo: 5, hour: 9,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "carousel",
    caption: "5 investment mistakes to avoid in your 40s (swipe for each one) #investing #mistakes #financialplanning",
    hookText: "5 investment mistakes to avoid in your 40s",
    hookType: "educational", hookScore: 81,
    likes: 1_800, comments: 280, shares: 920, saves: 1_200, views: 42_000,
    daysAgo: 7, hour: 11,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "text",
    caption: "Question for our community: How much of your portfolio is in international stocks? Let us know in the comments! #investing #diversification",
    hookText: "How much of your portfolio is in international stocks?",
    hookType: "cta", hookScore: 62,
    likes: 680, comments: 890, shares: 120, saves: 85, views: 18_000,
    daysAgo: 10, hour: 14,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "video",
    caption: "Why your bank's savings rate is a joke (and what to do instead) #savings #banking #personalfinance",
    hookText: "Your bank's savings rate is a joke",
    hookType: "controversy", hookScore: 79,
    likes: 2_600, comments: 410, shares: 1_500, saves: 720, views: 67_000,
    daysAgo: 13, hour: 16,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "image",
    caption: "Market recap: What moved this week and what to watch next #weeklyrecap #markets #stockmarket",
    hookText: "Market recap: What moved this week",
    hookType: "trend", hookScore: 65,
    likes: 920, comments: 180, shares: 340, saves: 210, views: 24_000,
    daysAgo: 15, hour: 17,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "video",
    caption: "The heartbreaking cost of financial illiteracy (a real client story, shared with permission) #financialliteracy #money #education",
    hookText: "The heartbreaking cost of financial illiteracy",
    hookType: "emotional", hookScore: 86,
    likes: 4_800, comments: 920, shares: 3_200, saves: 1_100, views: 112_000,
    daysAgo: 18, hour: 13,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "carousel",
    caption: "Bonds vs. bond ETFs: Which is better for your portfolio? (swipe to compare) #bonds #etf #fixedincome",
    hookText: "Bonds vs. bond ETFs: which is better?",
    hookType: "question", hookScore: 74,
    likes: 1_400, comments: 260, shares: 680, saves: 890, views: 36_000,
    daysAgo: 22, hour: 10,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "text",
    caption: "Join us this Saturday for a FREE live webinar on retirement planning strategies for 2026. Link in comments! #webinar #retirement #free",
    hookText: "Free live webinar on retirement planning",
    hookType: "cta", hookScore: 60,
    likes: 540, comments: 320, shares: 280, saves: 160, views: 15_000,
    daysAgo: 26, hour: 8,
  },
  {
    platform: "facebook", accountId: "acct_facebook", contentType: "video",
    caption: "Everything you need to know about Roth IRAs in under 5 minutes #rothira #retirement #investing101",
    hookText: "Everything about Roth IRAs in under 5 minutes",
    hookType: "educational", hookScore: 76,
    likes: 1_900, comments: 210, shares: 860, saves: 1_400, views: 48_000,
    daysAgo: 29, hour: 15,
  },
];

// ---------------------------------------------------------------------------
// LinkedIn Posts (10)
// ---------------------------------------------------------------------------

const linkedinPosts: PostSeed[] = [
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "I've been in wealth management for 15 years. The #1 mistake I see high-earners make is surprisingly simple. A thread. #wealthmanagement #leadership #finance",
    hookText: "The #1 mistake high-earners make",
    hookType: "story", hookScore: 89,
    likes: 4_200, comments: 380, shares: 1_200, saves: 620, views: 48_000,
    daysAgo: 1, hour: 8,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "carousel",
    caption: "We analyzed the investment strategies of 200 CFOs. Here are the surprising patterns we found. #cfo #investing #corporatefinance",
    hookText: "Investment strategies of 200 CFOs",
    hookType: "statistic", hookScore: 92,
    likes: 6_800, comments: 540, shares: 2_400, saves: 1_800, views: 72_000,
    daysAgo: 4, hour: 7,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "Controversial take: ESG investing is mostly marketing. The data on actual impact is underwhelming. Here's what I mean. #esg #sustainability #investing",
    hookText: "ESG investing is mostly marketing",
    hookType: "controversy", hookScore: 91,
    likes: 8_100, comments: 1_240, shares: 3_600, saves: 920, views: 96_000,
    daysAgo: 7, hour: 9,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "image",
    caption: "This chart explains the wealth gap better than any article. The top 10% own 89% of all stocks. #wealthgap #inequality #data",
    hookText: "The top 10% own 89% of all stocks",
    hookType: "statistic", hookScore: 85,
    likes: 3_900, comments: 290, shares: 1_800, saves: 1_100, views: 41_000,
    daysAgo: 10, hour: 10,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "To every young professional putting off investing: I ran the numbers on what 5 years of delay actually costs you. The answer hurt. #investing #careeradvice",
    hookText: "What 5 years of delay costs you",
    hookType: "emotional", hookScore: 83,
    likes: 2_800, comments: 210, shares: 980, saves: 740, views: 32_000,
    daysAgo: 12, hour: 11,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "3 emerging market opportunities that institutional investors are quietly accumulating. #emergingmarkets #institutional #investing",
    hookText: "3 emerging market opportunities institutions are quietly accumulating",
    hookType: "trend", hookScore: 80,
    likes: 2_400, comments: 180, shares: 860, saves: 520, views: 28_000,
    daysAgo: 15, hour: 8,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "carousel",
    caption: "The due diligence checklist we use before recommending any fund to clients (sharing it publicly for the first time) #duediligence #investing #transparency",
    hookText: "Our due diligence checklist, shared publicly for the first time",
    hookType: "educational", hookScore: 94,
    likes: 9_200, comments: 620, shares: 4_100, saves: 3_400, views: 108_000,
    daysAgo: 18, hour: 7,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "Is private equity overrated? After 15 years of data, I have an uncomfortable answer. #privateequity #investing #alternativeinvestments",
    hookText: "Is private equity overrated?",
    hookType: "question", hookScore: 87,
    likes: 5_400, comments: 480, shares: 2_100, saves: 860, views: 62_000,
    daysAgo: 21, hour: 12,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "text",
    caption: "We're hiring! Looking for a senior analyst to join our research team. If you're passionate about markets and data, let's talk. #hiring #jobs #finance",
    hookText: "We're hiring a senior analyst",
    hookType: "cta", hookScore: 55,
    likes: 1_200, comments: 340, shares: 620, saves: 180, views: 19_000,
    daysAgo: 25, hour: 9,
  },
  {
    platform: "linkedin", accountId: "acct_linkedin", contentType: "image",
    caption: "Our Q4 2025 market outlook in one infographic. Save it, share it, debate it. #marketoutlook #q4 #investing",
    hookText: "Q4 2025 market outlook in one infographic",
    hookType: "trend", hookScore: 72,
    likes: 1_800, comments: 140, shares: 780, saves: 620, views: 22_000,
    daysAgo: 29, hour: 10,
  },
];

// ---------------------------------------------------------------------------
// Combine
// ---------------------------------------------------------------------------

const allSeeds: PostSeed[] = [
  ...tiktokPosts,
  ...instagramPosts,
  ...youtubePosts,
  ...twitterPosts,
  ...facebookPosts,
  ...linkedinPosts,
];

export const seedPosts: SocialPost[] = allSeeds.map(makePost);
