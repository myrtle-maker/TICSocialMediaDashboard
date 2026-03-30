"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG, PLATFORMS } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { Platform, SocialAccount, KpiData } from "@/types/social";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";

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

export default function PlatformsPage() {
  const { filters, refreshKey } = useFilters();

  const [overviewData, setOverviewData] = useState<KpiData | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams(filters);
      const [overviewRes, accountsRes] = await Promise.all([
        fetch(`/api/analytics/overview?${filterParams}`),
        fetch("/api/accounts"),
      ]);
      const overview = await overviewRes.json();
      const accountsData = await accountsRes.json();
      setOverviewData(overview);
      setAccounts(accountsData.accounts ?? []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch platforms data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build per-platform data from the overview's platformBreakdown (full DB counts, no limit)
  const platformData = useMemo(() => {
    if (!overviewData) return [];
    return PLATFORMS
      .map((platform) => {
        const breakdown = overviewData.platformBreakdown.find((pb) => pb.platform === platform);
        if (!breakdown || breakdown.posts === 0) return null;
        return {
          platform,
          config: PLATFORM_CONFIG[platform],
          stats: {
            posts: breakdown.posts,
            totalEngagement: breakdown.engagement,
            avgEngagementRate: breakdown.avgEngagementRate,
            totalViews: breakdown.views,
          },
          accountCount: accounts.filter((a) => a.platform === platform).length,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [overviewData, accounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Platforms</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Compare performance across all your social media platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {platformData.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No platform data available for the current filters.</p>
      ) : (
        <>
          {/* Platform Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformData.map(({ platform, config, stats, accountCount }) => (
              <Link key={platform} href={`/platforms/${platform}`} className="group">
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
              <CardTitle className="text-sm font-medium">Platform Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="pb-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Platform</th>
                      <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Posts</th>
                      <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Total Views</th>
                      <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Total Engagement</th>
                      <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Avg Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformData.map(({ platform, config, stats }) => (
                      <tr key={platform} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={platform} size="sm" />
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">{formatNumber(stats.posts)}</td>
                        <td className="py-3 text-right">{formatNumber(stats.totalViews)}</td>
                        <td className="py-3 text-right">{formatNumber(stats.totalEngagement)}</td>
                        <td className="py-3 text-right">
                          <Badge variant={stats.avgEngagementRate > 5 ? "success" : "secondary"}>
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
        </>
      )}
    </div>
  );
}
