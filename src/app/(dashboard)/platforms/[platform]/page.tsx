"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useFilters } from "@/components/filters/filter-context";
import { getPosts, getKpis } from "@/lib/db";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PostFeed } from "@/components/posts/post-feed";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/types/social";
import { FileText, TrendingUp, Percent, Eye, Heart, Share2 } from "lucide-react";

export default function SinglePlatformPage() {
  const params = useParams();
  const platform = params.platform as Platform;
  const { filters } = useFilters();

  const platformFilters = useMemo(
    () => ({
      ...filters,
      platforms: [platform],
    }),
    [filters, platform]
  );

  const kpis = useMemo(() => getKpis(platformFilters), [platformFilters]);
  const posts = useMemo(
    () => getPosts({ ...platformFilters, sortBy: "publishedAt", sortOrder: "desc" }),
    [platformFilters]
  );

  const config = PLATFORM_CONFIG[platform];

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">Platform not found.</p>
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
        <PostFeed posts={posts} />
      </div>
    </div>
  );
}
