"use client";

import type { SocialPost } from "@/types/social";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, truncateText, formatRelativeTime, formatPercentage } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Heart, MessageCircle, Share2, Bookmark, Eye, TrendingUp, ExternalLink, GitCompareArrows } from "lucide-react";
import { WhyWorkedTooltip } from "@/components/posts/why-worked-tooltip";

interface PostCardProps {
  post: SocialPost;
  onClick?: (post: SocialPost) => void;
  onCompare?: (post: SocialPost) => void;
  avgER?: number;
  isSelectedForCompare?: boolean;
}

export function PostCard({ post, onClick, onCompare, avgER = 5, isSelectedForCompare = false }: PostCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all hover:border-zinc-300 dark:hover:border-zinc-600 ${
        isSelectedForCompare ? "ring-2 ring-blue-500 border-blue-300 dark:border-blue-700" : ""
      }`}
      onClick={() => onClick?.(post)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          {post.thumbnailUrl && (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
              <PlatformIcon platform={post.platform} size="sm" />
              <Badge variant="secondary" className="text-[10px]">
                {CONTENT_TYPE_LABELS[post.contentType]}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{ borderColor: PLATFORM_CONFIG[post.platform].color }}
              >
                {HOOK_TYPE_LABELS[post.hookType]}
              </Badge>
              <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
                {formatRelativeTime(post.publishedAt)}
              </span>
            </div>

            {/* Caption */}
            <p className="mb-2 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
              {truncateText(post.caption, 120)}
            </p>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {post.hashtags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
                {post.hashtags.length > 4 && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    +{post.hashtags.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Metrics */}
            <div className="flex flex-wrap items-center gap-4">
              <MetricItem icon={Eye} value={post.views} label="views" />
              <MetricItem icon={Heart} value={post.likes} label="likes" />
              <MetricItem icon={MessageCircle} value={post.comments} label="comments" />
              <MetricItem icon={Share2} value={post.shares} label="shares" />
              <MetricItem icon={Bookmark} value={post.saves} label="saves" />
              {onCompare && (
                <button
                  type="button"
                  title="Compare this post"
                  className={`ml-auto rounded p-1 transition-colors ${
                    isSelectedForCompare
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompare(post);
                  }}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </button>
              )}
              <div className={`${onCompare ? "" : "ml-auto "}flex items-center gap-1.5 text-xs font-medium text-emerald-600`}>
                <TrendingUp className="h-3 w-3" />
                <span>{formatPercentage(post.engagementRate)}</span>
                <WhyWorkedTooltip
                  postId={post.id}
                  engagementRate={post.engagementRate}
                  hookType={post.hookType}
                  contentType={post.contentType}
                  platform={post.platform}
                  avgER={avgER}
                  saves={post.saves}
                  shares={post.shares}
                  views={post.views}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" title={label}>
      <Icon className="h-3 w-3" />
      <span>{formatNumber(value)}</span>
    </div>
  );
}
