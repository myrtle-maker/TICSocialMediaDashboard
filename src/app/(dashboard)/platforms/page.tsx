"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFilters } from "@/components/filters/filter-context";
import { getPosts, getAccounts } from "@/lib/db";
import { PLATFORM_CONFIG, PLATFORMS } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { Platform, SocialPost } from "@/types/social";
import { ArrowRight } from "lucide-react";

function computePlatformStats(posts: SocialPost[], platform: Platform) {
  const filtered = posts.filter((p) => p.platform === platform);
  const totalEngagement = filtered.reduce(
    (s, p) => s + p.likes + p.comments + p.shares + p.saves,
    0
  );
  const avgRate =
    filtered.length > 0
      ? filtered.reduce((s, p) => s + p.engagementRate, 0) / filtered.length
      : 0;
  const totalViews = filtered.reduce((s, p) => s + p.views, 0);
  return {
    posts: filtered.length,
    totalEngagement,
    avgEngagementRate: avgRate,
    totalViews,
  };
}

export default function PlatformsPage() {
  const { filters } = useFilters();

  const allPosts = useMemo(() => getPosts(filters), [filters]);
  const accounts = useMemo(() => getAccounts(), []);

  const platformData = useMemo(
    () =>
      PLATFORMS.map((platform) => ({
        platform,
        config: PLATFORM_CONFIG[platform],
        stats: computePlatformStats(allPosts, platform),
        accountCount: accounts.filter((a) => a.platform === platform).length,
      })).filter((d) => d.stats.posts > 0),
    [allPosts, accounts]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Platforms</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Compare performance across all your social media platforms.
        </p>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformData.map(({ platform, config, stats, accountCount }) => (
          <Link
            key={platform}
            href={`/platforms/${platform}`}
            className="group"
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform} size="lg" />
                  <div>
                    <CardTitle className="text-base">{config.label}</CardTitle>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {accountCount} account{accountCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1 dark:text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Posts</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(stats.posts)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Engagement</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(stats.totalEngagement)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Rate</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatPercentage(stats.avgEngagementRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Views</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(stats.totalViews)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Platform Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="pb-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Platform
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    Posts
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    Total Views
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    Total Engagement
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    Avg Engagement Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {platformData.map(({ platform, config, stats }) => (
                  <tr
                    key={platform}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} size="sm" />
                        <span className="font-medium">{config.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      {formatNumber(stats.posts)}
                    </td>
                    <td className="py-3 text-right">
                      {formatNumber(stats.totalViews)}
                    </td>
                    <td className="py-3 text-right">
                      {formatNumber(stats.totalEngagement)}
                    </td>
                    <td className="py-3 text-right">
                      <Badge
                        variant={
                          stats.avgEngagementRate > 5 ? "success" : "secondary"
                        }
                      >
                        {formatPercentage(stats.avgEngagementRate)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
