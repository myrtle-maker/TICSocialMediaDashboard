"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { BaseChart } from "@/components/charts/base-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { SocialPost, ContentTypeAnalysis, PostingTimeHeatmap, HashtagPerformance } from "@/types/social";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function computeContentAnalysis(posts: SocialPost[]): ContentTypeAnalysis[] {
  const map = new Map<string, { count: number; totalRate: number; totalViews: number; totalEngagement: number }>();
  for (const post of posts) {
    const existing = map.get(post.contentType) ?? { count: 0, totalRate: 0, totalViews: 0, totalEngagement: 0 };
    existing.count += 1;
    existing.totalRate += post.engagementRate;
    existing.totalViews += post.views;
    existing.totalEngagement += post.likes + post.comments + post.shares + post.saves;
    map.set(post.contentType, existing);
  }
  return Array.from(map.entries()).map(([contentType, d]) => ({
    contentType: contentType as SocialPost["contentType"],
    postCount: d.count,
    avgEngagementRate: d.count > 0 ? d.totalRate / d.count : 0,
    avgViews: d.count > 0 ? d.totalViews / d.count : 0,
    totalEngagement: d.totalEngagement,
  }));
}

function computeHeatmap(posts: SocialPost[]): PostingTimeHeatmap[] {
  const map = new Map<string, { totalRate: number; count: number }>();
  for (const post of posts) {
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

function computeHashtagPerformance(posts: SocialPost[]): HashtagPerformance[] {
  const map = new Map<string, { count: number; totalRate: number; totalViews: number }>();
  for (const post of posts) {
    for (const tag of post.hashtags) {
      const existing = map.get(tag) ?? { count: 0, totalRate: 0, totalViews: 0 };
      existing.count += 1;
      existing.totalRate += post.engagementRate;
      existing.totalViews += post.views;
      map.set(tag, existing);
    }
  }
  return Array.from(map.entries())
    .map(([hashtag, d]) => ({
      hashtag,
      postCount: d.count,
      avgEngagementRate: d.count > 0 ? d.totalRate / d.count : 0,
      totalViews: d.totalViews,
    }))
    .sort((a, b) => b.postCount - a.postCount);
}

export default function ContentPage() {
  const { filters, refreshKey } = useFilters();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams(filters);
      const res = await fetch(`/api/posts?${filterParams}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch content data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contentAnalysis = useMemo(() => computeContentAnalysis(posts), [posts]);
  const heatmapData = useMemo(() => computeHeatmap(posts), [posts]);
  const hashtagPerformance = useMemo(() => computeHashtagPerformance(posts), [posts]);

  const barData = useMemo(
    () =>
      contentAnalysis.map((c) => ({
        name: CONTENT_TYPE_LABELS[c.contentType],
        avgEngagementRate: parseFloat(c.avgEngagementRate.toFixed(2)),
        postCount: c.postCount,
      })),
    [contentAnalysis]
  );

  const pieData = useMemo(
    () =>
      contentAnalysis.map((c) => ({
        name: CONTENT_TYPE_LABELS[c.contentType],
        value: c.postCount,
      })),
    [contentAnalysis]
  );

  // Build heatmap grid: 7 days x 24 hours
  const heatmapGrid = useMemo(() => {
    const maxRate = Math.max(
      ...heatmapData.map((h) => h.avgEngagementRate),
      1
    );
    const grid: {
      day: number;
      hour: number;
      rate: number;
      count: number;
      intensity: number;
    }[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: typeof grid[0] = [];
      for (let h = 0; h < 24; h++) {
        const cell = heatmapData.find((c) => c.day === d && c.hour === h);
        const rate = cell?.avgEngagementRate ?? 0;
        row.push({
          day: d,
          hour: h,
          rate,
          count: cell?.postCount ?? 0,
          intensity: maxRate > 0 ? rate / maxRate : 0,
        });
      }
      grid.push(row);
    }
    return grid;
  }, [heatmapData]);

  const hashtagCsvData = useMemo(
    () =>
      hashtagPerformance.map((h) => ({
        hashtag: h.hashtag,
        postCount: h.postCount,
        avgEngagementRate: h.avgEngagementRate.toFixed(2),
        totalViews: h.totalViews,
      })),
    [hashtagPerformance]
  );

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
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Content Analysis</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Understand which content types and posting patterns drive the most
          engagement.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No posts found for the current filters.</p>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart: Avg Engagement Rate by Content Type */}
            <BaseChart
              title="Avg Engagement Rate by Content Type"
              tooltip="Average engagement rate for each content type across filtered posts."
              height={300}
            >
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Avg Rate"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avgEngagementRate" radius={[4, 4, 0, 0]}>
                  {barData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </BaseChart>

            {/* Donut Chart: Content Type Distribution */}
            <BaseChart
              title="Content Type Distribution"
              tooltip="Breakdown of posts by content type."
              height={300}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(props: any) =>
                    `${props.name} ${(props.percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </BaseChart>
          </div>

          {/* Posting Time Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Posting Time Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Engagement rate by day of week and hour (UTC). Darker cells indicate
                higher engagement.
              </p>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  {/* Hour labels */}
                  <div className="flex">
                    <div className="w-12 shrink-0" />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div
                        key={h}
                        className="flex w-7 items-center justify-center text-[10px] text-zinc-400 dark:text-zinc-500"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {/* Grid rows */}
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
                                : `rgba(59, 130, 246, ${
                                    0.1 + cell.intensity * 0.9
                                  })`,
                          }}
                          title={`${DAY_LABELS[cell.day]} ${cell.hour}:00 - Rate: ${cell.rate.toFixed(2)}%, Posts: ${cell.count}`}
                        />
                      ))}
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span>Low</span>
                    <div className="flex">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                        <div
                          key={intensity}
                          className="h-3 w-5 rounded-sm"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                          }}
                        />
                      ))}
                    </div>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hashtag Performance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Hashtag Performance
              </CardTitle>
              <ExportCsvButton
                data={hashtagCsvData}
                filename="hashtag-performance"
              />
            </CardHeader>
            <CardContent>
              {hashtagPerformance.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No hashtag data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="pb-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                          Hashtag
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          Posts
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          Avg Engagement Rate
                        </th>
                        <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          Total Views
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hashtagPerformance.slice(0, 20).map((h) => (
                        <tr
                          key={h.hashtag}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                          <td className="py-2.5">
                            <Badge variant="secondary">{h.hashtag}</Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            {formatNumber(h.postCount)}
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge
                              variant={
                                h.avgEngagementRate > 5 ? "success" : "secondary"
                              }
                            >
                              {formatPercentage(h.avgEngagementRate)}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            {formatNumber(h.totalViews)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
