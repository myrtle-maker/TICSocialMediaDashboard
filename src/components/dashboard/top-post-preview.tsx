"use client";

import type { SocialPost } from "@/types/social";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, truncateText, formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Trophy, Heart, MessageCircle, Share2, Bookmark, Eye } from "lucide-react";

interface TopPostPreviewProps {
  post: SocialPost | null;
}

export function TopPostPreview({ post }: TopPostPreviewProps) {
  if (!post) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Performing Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No posts found for the selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top Performing Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          {post.thumbnailUrl && (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <PlatformIcon platform={post.platform} size="sm" />
              <Badge variant="secondary" className="text-[10px]">
                {HOOK_TYPE_LABELS[post.hookType]}
              </Badge>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {formatRelativeTime(post.publishedAt)}
              </span>
            </div>
            <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
              {truncateText(post.caption, 100)}
            </p>
            <div className="flex flex-wrap gap-3">
              <MetricPill icon={Eye} value={post.views} />
              <MetricPill icon={Heart} value={post.likes} />
              <MetricPill icon={MessageCircle} value={post.comments} />
              <MetricPill icon={Share2} value={post.shares} />
              <MetricPill icon={Bookmark} value={post.saves} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricPill({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      <Icon className="h-3 w-3" />
      <span>{formatNumber(value)}</span>
    </div>
  );
}
