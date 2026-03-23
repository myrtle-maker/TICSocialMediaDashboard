"use client";

import { useMemo } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { getKpis, getTrends, getPosts } from "@/lib/db";
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
} from "lucide-react";

export default function OverviewPage() {
  const { filters } = useFilters();

  const kpis = useMemo(() => getKpis(filters), [filters]);
  const trends = useMemo(() => getTrends(filters), [filters]);
  const recentPosts = useMemo(
    () =>
      getPosts({
        ...filters,
        sortBy: "publishedAt",
        sortOrder: "desc",
      }).slice(0, 5),
    [filters]
  );

  const engagementBreakdown = useMemo(
    () =>
      kpis.platformBreakdown.map((pb) => ({
        platform: pb.platform,
        value: pb.engagement,
      })),
    [kpis]
  );

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

      {/* Engagement Trend Chart */}
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

      {/* Recent Posts */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Posts
        </h3>
        <PostFeed posts={recentPosts} />
      </div>
    </div>
  );
}
