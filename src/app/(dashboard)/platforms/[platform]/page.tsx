"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PostFeed } from "@/components/posts/post-feed";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import type { Platform, SocialPost } from "@/types/social";
import { FileText, TrendingUp, Percent, Eye, Heart, Share2, Loader2 } from "lucide-react";

function buildFilterParams(filters: ReturnType<typeof useFilters>["filters"]): string {
  const params = new URLSearchParams();
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

export default function SinglePlatformPage() {
  const params = useParams();
  const platform = params.platform as Platform;
  const { filters, refreshKey } = useFilters();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams(filters);
      const res = await fetch(
        `/api/posts?platforms=${platform}&sortBy=publishedAt&sortOrder=desc&${filterParams}`
      );
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch platform posts:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey, platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = useMemo(() => {
    const totalPosts = posts.length;
    const totalEngagement = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares + p.saves,
      0
    );
    const avgEngagementRate =
      totalPosts > 0
        ? posts.reduce((s, p) => s + p.engagementRate, 0) / totalPosts
        : 0;
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalShares = posts.reduce((s, p) => s + p.shares, 0);
    return { totalPosts, totalEngagement, avgEngagementRate, totalViews, totalLikes, totalShares };
  }, [posts]);

  const config = PLATFORM_CONFIG[platform];

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">Platform not found.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PlatformIcon platform={platform} size="lg" />
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{config.label}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Performance metrics and posts for {config.label}.
          </p>
        </div>
        <Badge
          className="ml-auto"
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          {kpis.totalPosts} posts
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Posts"
          tooltip={`Total ${config.label} posts matching filters.`}
          value={kpis.totalPosts}
          icon={<FileText className="h-5 w-5" style={{ color: config.color }} />}
        />
        <KpiCard
          label="Engagement"
          tooltip={`Total engagement on ${config.label}.`}
          value={kpis.totalEngagement}
          icon={<TrendingUp className="h-5 w-5" style={{ color: config.color }} />}
        />
        <KpiCard
          label="Avg Rate"
          tooltip={`Average engagement rate on ${config.label}.`}
          value={kpis.avgEngagementRate}
          format="percentage"
          icon={<Percent className="h-5 w-5" style={{ color: config.color }} />}
        />
        <KpiCard
          label="Views"
          tooltip={`Total views on ${config.label}.`}
          value={kpis.totalViews}
          icon={<Eye className="h-5 w-5" style={{ color: config.color }} />}
        />
        <KpiCard
          label="Likes"
          tooltip={`Total likes on ${config.label}.`}
          value={kpis.totalLikes}
          icon={<Heart className="h-5 w-5" style={{ color: config.color }} />}
        />
        <KpiCard
          label="Shares"
          tooltip={`Total shares on ${config.label}.`}
          value={kpis.totalShares}
          icon={<Share2 className="h-5 w-5" style={{ color: config.color }} />}
        />
      </div>

      {/* Post Feed */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {config.label} Posts
        </h3>
        {posts.length > 0 ? (
          <PostFeed posts={posts} />
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No posts found for {config.label}.</p>
        )}
      </div>
    </div>
  );
}
