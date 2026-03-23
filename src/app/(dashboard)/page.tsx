"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TopPostPreview } from "@/components/dashboard/top-post-preview";
import { PlatformBreakdownBar } from "@/components/dashboard/platform-breakdown-bar";
import { PostFeed } from "@/components/posts/post-feed";
import { BaseChart } from "@/components/charts/base-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  FileText,
  TrendingUp,
  Percent,
  Eye,
  Heart,
  Share2,
  Loader2,
} from "lucide-react";
import type { SocialPost, KpiData, TrendDataPoint } from "@/types/social";
import type { Insight } from "@/types/insights";
import { TopInsightsStrip } from "@/components/insights/top-insights-strip";
import Link from "next/link";

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

export default function OverviewPage() {
  const { filters, refreshKey } = useFilters();

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  const [allPosts, setAllPosts] = useState<SocialPost[]>([]);
  const [topInsights, setTopInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams(filters);

      const [kpiRes, recentRes, allRes, insightsRes] = await Promise.all([
        fetch(`/api/analytics/overview?${filterParams}`),
        fetch(`/api/posts?sortBy=publishedAt&sortOrder=desc&limit=5&${filterParams}`),
        fetch(`/api/posts?${filterParams}`),
        fetch(`/api/analytics/insights?${filterParams}`),
      ]);

      const kpiData = await kpiRes.json();
      const recentData = await recentRes.json();
      const allData = await allRes.json();
      const insightsData = await insightsRes.json();

      setKpis(kpiData);
      setRecentPosts(recentData.posts ?? []);
      setAllPosts(allData.posts ?? []);
      setTopInsights((insightsData.insights ?? []).slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch overview data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute trends from posts (group by date)
  const trends = useMemo<TrendDataPoint[]>(() => {
    if (allPosts.length === 0) return [];
    const map = new Map<string, { posts: number; engagement: number; views: number; totalRate: number }>();
    for (const post of allPosts) {
      const date = new Date(post.publishedAt).toISOString().split("T")[0];
      const existing = map.get(date) ?? { posts: 0, engagement: 0, views: 0, totalRate: 0 };
      existing.posts += 1;
      existing.engagement += post.likes + post.comments + post.shares + post.saves;
      existing.views += post.views;
      existing.totalRate += post.engagementRate;
      map.set(date, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        posts: d.posts,
        engagement: d.engagement,
        views: d.views,
        engagementRate: d.posts > 0 ? d.totalRate / d.posts : 0,
      }));
  }, [allPosts]);

  const engagementBreakdown = useMemo(
    () =>
      kpis?.platformBreakdown?.map((pb) => ({
        platform: pb.platform,
        value: pb.engagement,
      })) ?? [],
    [kpis]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">No data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Overview</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your social media performance at a glance.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total Posts"
          tooltip="Total number of posts matching your current filters."
          value={kpis.totalPosts}
          icon={<FileText className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
        <KpiCard
          label="Total Engagement"
          tooltip="Sum of all likes, comments, shares, and saves across filtered posts."
          value={kpis.totalEngagement}
          icon={<TrendingUp className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
        <KpiCard
          label="Avg Engagement Rate"
          tooltip="The average engagement rate across all filtered posts."
          value={kpis.avgEngagementRate}
          format="percentage"
          icon={<Percent className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
        <KpiCard
          label="Total Views"
          tooltip="Combined view count across all filtered posts."
          value={kpis.totalViews}
          icon={<Eye className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
        <KpiCard
          label="Total Likes"
          tooltip="Combined like count across all filtered posts."
          value={kpis.totalLikes}
          icon={<Heart className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
        <KpiCard
          label="Total Shares"
          tooltip="Combined share count across all filtered posts."
          value={kpis.totalShares}
          icon={<Share2 className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        />
      </div>

      {/* Top Post + Platform Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopPostPreview post={kpis.topPost} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Platform Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformBreakdownBar
              data={engagementBreakdown}
              label="Engagement by Platform"
            />
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      {topInsights.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Key Insights
            </h3>
            <Link
              href="/insights"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View all insights
            </Link>
          </div>
          <TopInsightsStrip insights={topInsights} />
        </div>
      )}

      {/* Engagement Trend Chart */}
      {trends.length > 0 && (
        <BaseChart
          title="Engagement Trend"
          tooltip="Daily engagement totals over time for filtered posts."
          height={300}
        >
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e4e4e7",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Engagement"
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Views"
            />
          </LineChart>
        </BaseChart>
      )}

      {/* Recent Posts */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Posts
        </h3>
        {recentPosts.length > 0 ? (
          <PostFeed posts={recentPosts} />
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No recent posts found.</p>
        )}
      </div>
    </div>
  );
}
