"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { SocialPost, PostingTimeHeatmap, Platform } from "@/types/social";
import {
  Info,
  Globe,
  Clock,
  Star,
  Loader2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
} from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
);

// ---------------------------------------------------------------------------
// Language inference from caption text + hashtags
// ---------------------------------------------------------------------------

function inferLanguage(caption: string, hashtags: string[]): string {
  const text = caption;
  const tagStr = hashtags.join(" ").toLowerCase();

  // Non-Latin scripts — high confidence detection via unicode ranges
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return "Arabic";
  if (/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "Chinese / Japanese";
  if (/[\uAC00-\uD7AF]/.test(text)) return "Korean";
  if (/[\u0400-\u04FF]/.test(text)) return "Russian / Cyrillic";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  if (/[\u0E00-\u0E7F]/.test(text)) return "Thai";
  if (/[\u0370-\u03FF]/.test(text)) return "Greek";
  if (/[\u0590-\u05FF]/.test(text)) return "Hebrew";

  // Hashtag-based language detection for Latin-script languages
  if (/(#español|#espanol|#españa|#latinoamerica|#mexico|#colombia|#argentina|#chile|#peru|#venezuel)/.test(tagStr)) return "Spanish";
  if (/(#brasil|#brazil|#português|#portugues|#portugal|#brasilia|#riodejaneiro|#saopaulo)/.test(tagStr)) return "Portuguese";
  if (/(#français|#france|#francais|#belgique|#québec|#quebec|#paris|#marseille)/.test(tagStr)) return "French";
  if (/(#deutsch|#deutschland|#germany|#german|#österreich|#schweiz|#berlin|#münchen)/.test(tagStr)) return "German";
  if (/(#italia|#italiano|#italy|#italian|#roma|#milano|#napoli)/.test(tagStr)) return "Italian";
  if (/(#nederland|#netherlands|#dutch|#holland|#amsterdam)/.test(tagStr)) return "Dutch";
  if (/(#türkiye|#turkey|#turkish|#istanbul|#ankara)/.test(tagStr)) return "Turkish";

  // Caption character hints for Latin-script languages
  if (/[ñÑ¿¡]/.test(text)) return "Spanish";
  if (/[ãõÃÕ]/.test(text)) return "Portuguese";
  if (/ß/.test(text)) return "German";

  return "English";
}

function computeLanguageDistribution(
  posts: SocialPost[]
): { language: string; count: number; percentage: number }[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    const lang = inferLanguage(post.caption, post.hashtags);
    map.set(lang, (map.get(lang) ?? 0) + 1);
  }
  const total = posts.length;
  return Array.from(map.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Engagement behavior
// ---------------------------------------------------------------------------

interface EngagementBehavior {
  likes: { count: number; pct: number };
  comments: { count: number; pct: number };
  shares: { count: number; pct: number };
  saves: { count: number; pct: number };
  total: number;
}

function computeEngagementBehavior(posts: SocialPost[]): EngagementBehavior | null {
  let likes = 0, comments = 0, shares = 0, saves = 0;
  for (const post of posts) {
    likes += post.likes;
    comments += post.comments;
    shares += post.shares;
    saves += post.saves;
  }
  const total = likes + comments + shares + saves;
  if (total === 0) return null;
  return {
    likes: { count: likes, pct: (likes / total) * 100 },
    comments: { count: comments, pct: (comments / total) * 100 },
    shares: { count: shares, pct: (shares / total) * 100 },
    saves: { count: saves, pct: (saves / total) * 100 },
    total,
  };
}

function audienceInterpretation(behavior: EngagementBehavior): string {
  if (behavior.saves.pct > 20)
    return "High save rate — your audience bookmarks content for later. They value educational, reference, or how-to posts. Create more step-by-step guides and resource lists.";
  if (behavior.shares.pct > 15)
    return "High share rate — your audience loves sharing your content with others. They resonate with relatable, entertaining, or surprising posts. Lean into shareworthy storytelling.";
  if (behavior.comments.pct > 10)
    return "High comment rate — your audience is community-driven and wants to discuss. They respond to opinion pieces, questions, and debate-worthy content. Ask more questions.";
  return "Engagement is primarily likes — your audience passively appreciates content. Focus on stronger hooks and calls-to-action to drive more active interaction (saves, comments, shares).";
}

// ---------------------------------------------------------------------------
// Per-platform engagement profile
// ---------------------------------------------------------------------------

interface PlatformEngagementProfile {
  platform: Platform;
  label: string;
  postCount: number;
  avgEngagementRate: number;
  likeShare: number;
  commentShare: number;
  shareShare: number;
  saveShare: number;
}

function computePlatformProfiles(posts: SocialPost[]): PlatformEngagementProfile[] {
  const map = new Map<Platform, { likes: number; comments: number; shares: number; saves: number; rates: number[]; count: number }>();
  for (const post of posts) {
    const p = post.platform;
    const existing = map.get(p) ?? { likes: 0, comments: 0, shares: 0, saves: 0, rates: [], count: 0 };
    existing.likes += post.likes;
    existing.comments += post.comments;
    existing.shares += post.shares;
    existing.saves += post.saves;
    if (post.engagementRate > 0) existing.rates.push(post.engagementRate);
    existing.count += 1;
    map.set(p, existing);
  }
  return Array.from(map.entries())
    .map(([platform, d]) => {
      const total = d.likes + d.comments + d.shares + d.saves;
      const config = PLATFORM_CONFIG[platform];
      return {
        platform,
        label: config?.label ?? platform,
        postCount: d.count,
        avgEngagementRate: d.rates.length > 0 ? d.rates.reduce((s, r) => s + r, 0) / d.rates.length : 0,
        likeShare: total > 0 ? (d.likes / total) * 100 : 0,
        commentShare: total > 0 ? (d.comments / total) * 100 : 0,
        shareShare: total > 0 ? (d.shares / total) * 100 : 0,
        saveShare: total > 0 ? (d.saves / total) * 100 : 0,
      };
    })
    .filter((p) => p.postCount > 0)
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

function buildFilterParams(filters: ReturnType<typeof useFilters>["filters"]): string {
  const params = new URLSearchParams();
  if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","));
  if (filters.contentTypes.length > 0) params.set("contentTypes", filters.contentTypes.join(","));
  if (filters.hookTypes.length > 0) params.set("hookTypes", filters.hookTypes.join(","));
  if (filters.dateRange) {
    params.set("dateFrom", filters.dateRange.from.toISOString());
    params.set("dateTo", filters.dateRange.to.toISOString());
  }
  if (filters.accounts.length > 0) params.set("accounts", filters.accounts.join(","));
  if (filters.minEngagementRate !== null) params.set("minEngagementRate", String(filters.minEngagementRate));
  if (filters.minViews !== null) params.set("minViews", String(filters.minViews));
  if (filters.hashtags.length > 0) params.set("hashtags", filters.hashtags.join(","));
  if (filters.searchQuery) params.set("searchQuery", filters.searchQuery);
  return params.toString();
}

function computeHeatmap(posts: SocialPost[]): PostingTimeHeatmap[] {
  const map = new Map<string, { totalRate: number; count: number }>();
  for (const post of posts) {
    if (post.engagementRate === 0) continue;
    const d = new Date(post.publishedAt);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;
    const existing = map.get(key) ?? { totalRate: 0, count: 0 };
    existing.totalRate += post.engagementRate;
    existing.count += 1;
    map.set(key, existing);
  }
  return Array.from(map.entries()).map(([key, d]) => {
    const [day, hour] = key.split("-").map(Number);
    return {
      day,
      hour,
      avgEngagementRate: d.count > 0 ? d.totalRate / d.count : 0,
      postCount: d.count,
    };
  });
}

// Language bar colours
const LANG_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

export default function AudiencePage() {
  const { filters, refreshKey } = useFilters();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams(filters);
      const res = await fetch(`/api/posts?limit=2000&${filterParams}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch audience data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const heatmapData = useMemo(() => computeHeatmap(posts), [posts]);
  const languageDist = useMemo(() => computeLanguageDistribution(posts), [posts]);
  const engagementBehavior = useMemo(() => computeEngagementBehavior(posts), [posts]);
  const platformProfiles = useMemo(() => computePlatformProfiles(posts), [posts]);

  const heatmapGrid = useMemo(() => {
    const maxRate = Math.max(...heatmapData.map((h) => h.avgEngagementRate), 1);
    const grid: { day: number; hour: number; rate: number; count: number; intensity: number }[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: typeof grid[0] = [];
      for (let h = 0; h < 24; h++) {
        const cell = heatmapData.find((c) => c.day === d && c.hour === h);
        const rate = cell?.avgEngagementRate ?? 0;
        row.push({ day: d, hour: h, rate, count: cell?.postCount ?? 0, intensity: maxRate > 0 ? rate / maxRate : 0 });
      }
      grid.push(row);
    }
    return grid;
  }, [heatmapData]);

  const bestTimes = useMemo(() => {
    return heatmapData
      .filter((h) => h.postCount > 0)
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
      .slice(0, 5)
      .map((t) => ({ day: DAY_LABELS[t.day], hour: `${t.hour}:00`, rate: t.avgEngagementRate, count: t.postCount }));
  }, [heatmapData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Audience Insights</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Understand when your audience engages, what they respond to, and what language they speak.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Derived from scraped post data
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            All metrics below are computed from your actual scraped posts — engagement patterns, posting times, and engagement type splits are real data.
            Content language is inferred from caption text and hashtag patterns, not from platform demographic APIs.
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No posts found for the current filters.</p>
      ) : (
        <>
          {/* Active Times Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                Active Times Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Avg engagement rate by publishing day and hour (UTC). Darker = higher engagement. Only posts with engagement data are counted.
              </p>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  <div className="flex">
                    <div className="w-12 shrink-0" />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="flex w-7 items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500">
                        {HOUR_LABELS[h]}
                      </div>
                    ))}
                  </div>
                  {heatmapGrid.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex items-center">
                      <div className="w-12 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {DAY_LABELS[dayIdx]}
                      </div>
                      {row.map((cell) => (
                        <div
                          key={`${cell.day}-${cell.hour}`}
                          className="m-0.5 h-6 w-6 rounded-sm transition-colors"
                          style={{
                            backgroundColor:
                              cell.count === 0
                                ? "#f4f4f5"
                                : `rgba(16, 185, 129, ${0.1 + cell.intensity * 0.9})`,
                          }}
                          title={`${DAY_LABELS[cell.day]} ${cell.hour}:00 UTC — Rate: ${cell.rate.toFixed(2)}%, Posts: ${cell.count}`}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span>Low</span>
                    <div className="flex">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                        <div key={intensity} className="h-3 w-5 rounded-sm" style={{ backgroundColor: `rgba(16, 185, 129, ${intensity})` }} />
                      ))}
                    </div>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Content Language Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  Content Language Distribution
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Inferred
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Detected from caption text and hashtag patterns across {posts.length} posts.
                </p>
                <div className="space-y-3">
                  {languageDist.map((lang, i) => (
                    <div key={lang.language}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">{lang.language}</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {lang.percentage}%
                          <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                            ({formatNumber(lang.count)} posts)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all ${LANG_COLORS[i % LANG_COLORS.length]}`}
                          style={{ width: `${lang.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audience Engagement Behavior */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  Audience Engagement Behavior
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!engagementBehavior ? (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">No engagement data available.</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      How your {formatNumber(engagementBehavior.total)} total engagements are distributed.
                    </p>
                    {/* Stacked bar */}
                    <div className="flex h-5 w-full overflow-hidden rounded-full">
                      <div className="bg-rose-400" style={{ width: `${engagementBehavior.likes.pct}%` }} title={`Likes ${engagementBehavior.likes.pct.toFixed(1)}%`} />
                      <div className="bg-blue-400" style={{ width: `${engagementBehavior.comments.pct}%` }} title={`Comments ${engagementBehavior.comments.pct.toFixed(1)}%`} />
                      <div className="bg-amber-400" style={{ width: `${engagementBehavior.shares.pct}%` }} title={`Shares ${engagementBehavior.shares.pct.toFixed(1)}%`} />
                      <div className="bg-emerald-400" style={{ width: `${engagementBehavior.saves.pct}%` }} title={`Saves ${engagementBehavior.saves.pct.toFixed(1)}%`} />
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Heart, label: "Likes", color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30", count: engagementBehavior.likes.count, pct: engagementBehavior.likes.pct },
                        { icon: MessageCircle, label: "Comments", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", count: engagementBehavior.comments.count, pct: engagementBehavior.comments.pct },
                        { icon: Share2, label: "Shares", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", count: engagementBehavior.shares.count, pct: engagementBehavior.shares.pct },
                        { icon: Bookmark, label: "Saves", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", count: engagementBehavior.saves.count, pct: engagementBehavior.saves.pct },
                      ].map(({ icon: Icon, label, color, bg, count, pct }) => (
                        <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bg}`}>
                          <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                          <div>
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {pct.toFixed(1)}% · {formatNumber(count)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Interpretation */}
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">What this tells you</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {audienceInterpretation(engagementBehavior)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-Platform Engagement Profile */}
          {platformProfiles.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Per-Platform Audience Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  How engagement type splits differ across platforms — reveals each platform's audience personality.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="pb-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Platform</th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Posts</th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Avg ER</th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center justify-end gap-1">
                            <Heart className="h-3.5 w-3.5 text-rose-400" /> Likes
                          </span>
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center justify-end gap-1">
                            <MessageCircle className="h-3.5 w-3.5 text-blue-400" /> Comments
                          </span>
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center justify-end gap-1">
                            <Share2 className="h-3.5 w-3.5 text-amber-400" /> Shares
                          </span>
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center justify-end gap-1">
                            <Bookmark className="h-3.5 w-3.5 text-emerald-400" /> Saves
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformProfiles.map((p) => (
                        <tr key={p.platform} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                          <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">{p.label}</td>
                          <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{formatNumber(p.postCount)}</td>
                          <td className="py-3 text-right">
                            <Badge variant={p.avgEngagementRate > 0.05 ? "success" : "secondary"}>
                              {formatPercentage(p.avgEngagementRate)}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{p.likeShare.toFixed(1)}%</td>
                          <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{p.commentShare.toFixed(1)}%</td>
                          <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{p.shareShare.toFixed(1)}%</td>
                          <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{p.saveShare.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Best Posting Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Star className="h-4 w-4 text-amber-500" />
                Best Posting Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Top-performing publishing windows based on actual engagement rate (UTC). Only windows with at least 1 post shown.
              </p>
              {bestTimes.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Not enough data to determine best posting times.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {bestTimes.map((t, idx) => (
                    <div key={`${t.day}-${t.hour}`} className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700">
                      <div className="mb-1">
                        <span className="text-xs font-bold text-amber-600">#{idx + 1}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.day} at {t.hour}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatPercentage(t.rate)} avg rate
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {t.count} post{t.count !== 1 ? "s" : ""} analyzed
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
