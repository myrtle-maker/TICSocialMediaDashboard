"use client";

import { useEffect, useState } from "react";
import type { MonthlyComparisonData } from "@/app/api/analytics/monthly-comparison/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import type { Platform } from "@/types/social";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  FileText,
  Percent,
  Loader2,
  Trophy,
} from "lucide-react";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants";

function DeltaBadge({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10;
  if (Math.abs(rounded) < 0.5) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-zinc-400">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }
  const isPos = rounded > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPos ? "+" : ""}
      {rounded.toFixed(1)}%
    </span>
  );
}

interface StatRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: number;
  previous: number;
  change: number;
  format?: "number" | "percentage";
}

function StatRow({ icon: Icon, label, current, previous, change, format = "number" }: StatRowProps) {
  const fmt = (v: number) => (format === "percentage" ? formatPercentage(v) : formatNumber(v));
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-400 dark:text-zinc-500 w-20 text-right">{fmt(previous)}</span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 w-20 text-right">{fmt(current)}</span>
        <div className="w-28 text-right">
          <DeltaBadge value={change} />
        </div>
      </div>
    </div>
  );
}

export default function MonthlyPage() {
  const [data, setData] = useState<MonthlyComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/monthly-comparison")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">Failed to load monthly comparison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Monthly Comparison</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {data.current.label} vs {data.previous.label}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Posts",
            icon: FileText,
            current: data.current.posts,
            previous: data.previous.posts,
            change: data.changes.posts,
          },
          {
            label: "Total Views",
            icon: Eye,
            current: data.current.totalViews,
            previous: data.previous.totalViews,
            change: data.changes.totalViews,
          },
          {
            label: "Engagement",
            icon: TrendingUp,
            current: data.current.totalEngagement,
            previous: data.previous.totalEngagement,
            change: data.changes.totalEngagement,
          },
          {
            label: "Avg ER",
            icon: Percent,
            current: data.current.avgEngagementRate,
            previous: data.previous.avgEngagementRate,
            change: data.changes.avgEngagementRate,
            format: "percentage" as const,
          },
        ].map(({ label, icon: Icon, current, previous, change, format }) => {
          const fmt = (v: number) => (format === "percentage" ? formatPercentage(v) : formatNumber(v));
          const isPos = change > 0.5;
          const isNeg = change < -0.5;
          return (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmt(current)}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    prev {fmt(previous)}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      isPos
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isNeg
                          ? "text-red-500 dark:text-red-400"
                          : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {isPos ? "+" : ""}{Math.round(change * 10) / 10}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Metric Breakdown</CardTitle>
            <div className="flex gap-4 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="w-20 text-right">{data.previous.label}</span>
              <span className="w-20 text-right">{data.current.label}</span>
              <span className="w-28 text-right">Change</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StatRow icon={FileText} label="Posts" current={data.current.posts} previous={data.previous.posts} change={data.changes.posts} />
          <StatRow icon={Eye} label="Total Views" current={data.current.totalViews} previous={data.previous.totalViews} change={data.changes.totalViews} />
          <StatRow icon={Heart} label="Total Likes" current={data.current.totalLikes} previous={data.previous.totalLikes} change={data.changes.totalLikes} />
          <StatRow icon={MessageCircle} label="Total Comments" current={data.current.totalComments} previous={data.previous.totalComments} change={data.changes.totalComments} />
          <StatRow icon={Share2} label="Total Shares" current={data.current.totalShares} previous={data.previous.totalShares} change={data.changes.totalShares} />
          <StatRow icon={Bookmark} label="Total Saves" current={data.current.totalSaves} previous={data.previous.totalSaves} change={data.changes.totalSaves} />
          <StatRow icon={Percent} label="Avg Engagement Rate" current={data.current.avgEngagementRate} previous={data.previous.avgEngagementRate} change={data.changes.avgEngagementRate} format="percentage" />
        </CardContent>
      </Card>

      {/* Platform breakdown */}
      {data.platformBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.platformBreakdown.map((pb) => {
              const postChange = pb.previous.posts > 0
                ? ((pb.current.posts - pb.previous.posts) / pb.previous.posts) * 100
                : 0;
              const erChange = pb.previous.avgEngagementRate > 0
                ? ((pb.current.avgEngagementRate - pb.previous.avgEngagementRate) / pb.previous.avgEngagementRate) * 100
                : 0;
              return (
                <div
                  key={pb.platform}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={pb.platform as Platform} size="sm" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {PLATFORM_CONFIG[pb.platform as Platform]?.label ?? pb.platform}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pb.current.posts} posts</p>
                      <DeltaBadge value={postChange} />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatPercentage(pb.current.avgEngagementRate)} ER</p>
                      <DeltaBadge value={erChange} />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatNumber(pb.current.totalViews)} views</p>
                      <Badge variant="secondary" className="text-[10px]">current</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Top post this month */}
      {data.topPostThisMonth && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Post This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              {data.topPostThisMonth.thumbnailUrl && (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={data.topPostThisMonth.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <PlatformIcon platform={data.topPostThisMonth.platform as Platform} size="sm" />
                  <Badge variant="secondary" className="text-[10px]">
                    {formatPercentage(data.topPostThisMonth.engagementRate)} ER
                  </Badge>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                  {data.topPostThisMonth.caption}
                </p>
                <div className="mt-1.5 flex gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                  <span>{formatNumber(data.topPostThisMonth.views)} views</span>
                  <span>{formatNumber(data.topPostThisMonth.likes)} likes</span>
                  <span>{formatNumber(data.topPostThisMonth.comments)} comments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
