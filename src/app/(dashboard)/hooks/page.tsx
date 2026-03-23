"use client";

import { useMemo } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { getHookAnalysis, getPosts } from "@/lib/db";
import {
  HOOK_TYPE_LABELS,
  HOOK_TYPE_COLORS,
} from "@/lib/constants";
import { BaseChart } from "@/components/charts/base-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage, truncateText } from "@/lib/utils";
import type { HookType } from "@/types/social";
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
import { Zap, Eye, Heart, Share2 } from "lucide-react";

export default function HooksPage() {
  const { filters } = useFilters();

  const hookAnalysis = useMemo(() => getHookAnalysis(filters), [filters]);
  const allPosts = useMemo(
    () =>
      getPosts({
        ...filters,
        sortBy: "hookScore",
        sortOrder: "desc",
      }),
    [filters]
  );

  const pieData = useMemo(
    () =>
      hookAnalysis.map((h) => ({
        name: HOOK_TYPE_LABELS[h.hookType],
        value: h.postCount,
        hookType: h.hookType,
      })),
    [hookAnalysis]
  );

  const barData = useMemo(
    () =>
      hookAnalysis.map((h) => ({
        name: HOOK_TYPE_LABELS[h.hookType],
        avgEngagementRate: parseFloat(h.avgEngagementRate.toFixed(2)),
        hookType: h.hookType,
      })),
    [hookAnalysis]
  );

  const topHooks = useMemo(() => allPosts.slice(0, 10), [allPosts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Hook Analysis</h2>
        <p className="text-sm text-zinc-500">
          Analyze how different hook types perform to craft better opening lines.
        </p>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hook Type Distribution Donut */}
        <BaseChart
          title="Hook Type Distribution"
          tooltip="How posts are distributed across hook types."
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
              {pieData.map((entry) => (
                <Cell
                  key={entry.hookType}
                  fill={HOOK_TYPE_COLORS[entry.hookType as HookType]}
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

        {/* Avg Engagement Rate per Hook Type Bar Chart */}
        <BaseChart
          title="Avg Engagement Rate by Hook Type"
          tooltip="Average engagement rate for each hook type."
          height={300}
        >
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} />
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
              {barData.map((entry) => (
                <Cell
                  key={entry.hookType}
                  fill={HOOK_TYPE_COLORS[entry.hookType as HookType]}
                />
              ))}
            </Bar>
          </BarChart>
        </BaseChart>
      </div>

      {/* Hook Type Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hookAnalysis.map((h) => (
          <Card key={h.hookType}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: HOOK_TYPE_COLORS[h.hookType],
                  }}
                />
                <span className="text-sm font-semibold">
                  {HOOK_TYPE_LABELS[h.hookType]}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {h.postCount} posts
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500">Avg Rate</p>
                  <p className="text-sm font-bold">
                    {formatPercentage(h.avgEngagementRate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Avg Views</p>
                  <p className="text-sm font-bold">
                    {formatNumber(h.avgViews)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Avg Shares</p>
                  <p className="text-sm font-bold">
                    {formatNumber(h.avgShares)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hook Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-amber-500" />
            Top 10 Hooks by Hook Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topHooks.map((post, idx) => (
              <div
                key={post.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      className="text-[10px]"
                      style={{
                        backgroundColor:
                          HOOK_TYPE_COLORS[post.hookType] + "20",
                        color: HOOK_TYPE_COLORS[post.hookType],
                        borderColor: HOOK_TYPE_COLORS[post.hookType] + "40",
                      }}
                    >
                      {HOOK_TYPE_LABELS[post.hookType]}
                    </Badge>
                    <span className="text-xs font-medium text-amber-600">
                      Score: {post.hookScore.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">
                    &ldquo;{truncateText(post.hookText, 120)}&rdquo;
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(post.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {formatNumber(post.shares)}
                    </span>
                    <span>
                      Rate: {formatPercentage(post.engagementRate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
