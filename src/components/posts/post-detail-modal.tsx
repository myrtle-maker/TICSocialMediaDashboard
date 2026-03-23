"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Heart, MessageCircle, Share2, Bookmark, Eye, TrendingUp, Zap, ExternalLink } from "lucide-react";
import type { SocialPost } from "@/types/social";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PostDetailModalProps {
  post: SocialPost | null;
  open: boolean;
  onClose: () => void;
}

export function PostDetailModal({ post, open, onClose }: PostDetailModalProps) {
  if (!post) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-200 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          {/* Close button */}
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>

          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <PlatformIcon platform={post.platform} size="lg" showLabel />
            <div className="flex gap-2">
              <Badge variant="secondary">{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
              <Badge variant="outline">{HOOK_TYPE_LABELS[post.hookType]}</Badge>
            </div>
          </div>

          {/* Caption */}
          <div className="mb-4">
            <h4 className="mb-1 text-xs font-medium text-zinc-500">Caption</h4>
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
              {post.caption}
            </p>
          </div>

          {/* Hook Analysis */}
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-600" />
              <h4 className="text-xs font-semibold text-amber-800">Hook Analysis</h4>
            </div>
            <p className="text-sm text-amber-700 mb-1">&ldquo;{post.hookText}&rdquo;</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-600">
                Type: <strong>{HOOK_TYPE_LABELS[post.hookType]}</strong>
              </span>
              <span className="text-xs text-amber-600">
                Score: <strong>{post.hookScore}/100</strong>
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MetricBox icon={Eye} label="Views" value={post.views} />
            <MetricBox icon={Heart} label="Likes" value={post.likes} />
            <MetricBox icon={MessageCircle} label="Comments" value={post.comments} />
            <MetricBox icon={Share2} label="Shares" value={post.shares} />
            <MetricBox icon={Bookmark} label="Saves" value={post.saves} />
            <MetricBox
              icon={TrendingUp}
              label="Engagement Rate"
              value={post.engagementRate}
              format="percentage"
            />
          </div>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-1.5 text-xs font-medium text-zinc-500">Hashtags</h4>
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Published Date & Link */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-xs text-zinc-400">
              Published: {post.publishedAt.toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Original
                </Button>
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  format = "number",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  format?: "number" | "percentage";
}) {
  return (
    <div className="rounded-lg border border-zinc-100 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-zinc-400" />
      <p className="text-lg font-bold text-zinc-900">
        {format === "percentage" ? formatPercentage(value) : formatNumber(value)}
      </p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
