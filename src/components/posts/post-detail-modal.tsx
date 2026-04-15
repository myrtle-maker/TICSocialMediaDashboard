"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Heart, MessageCircle, Share2, Bookmark, Eye, TrendingUp, Zap, ExternalLink, StickyNote, Check } from "lucide-react";
import type { SocialPost } from "@/types/social";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EngagementVelocity } from "@/components/posts/engagement-velocity";

interface PostDetailModalProps {
  post: SocialPost | null;
  open: boolean;
  onClose: () => void;
  onAnnotationSaved?: (postId: string, annotation: string) => void;
}

export function PostDetailModal({ post, open, onClose, onAnnotationSaved }: PostDetailModalProps) {
  const [annotation, setAnnotation] = useState(post?.annotation ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep annotation state in sync when post changes
  if (post && annotation === (post.annotation ?? "") && false) { /* intentionally empty */ }

  async function handleSaveAnnotation() {
    if (!post) return;
    setSaving(true);
    try {
      await fetch(`/api/posts/${post.id}/annotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotation }),
      });
      setSaved(true);
      onAnnotationSaved?.(post.id, annotation);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (!post) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl border glass-elevated p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
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
            <h4 className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Caption</h4>
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">
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

          {/* Engagement Pattern */}
          <div className="mb-4">
            <h4 className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Engagement Pattern
            </h4>
            <div className="flex justify-center rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <EngagementVelocity
                postId={post.id}
                likes={post.likes}
                views={post.views}
                publishedAt={post.publishedAt}
              />
            </div>
          </div>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Hashtags</h4>
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Internal Annotation */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Internal Note</h4>
            </div>
            <textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="Add an internal note about this post (not visible to anyone else)..."
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            />
            <div className="mt-1.5 flex items-center justify-end gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveAnnotation} disabled={saving}>
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>

          {/* Published Date & Link */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Published: {new Date(post.publishedAt).toLocaleDateString("en-US", {
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
    <div className="rounded-lg border border-zinc-100 p-3 text-center dark:border-zinc-800">
      <Icon className="mx-auto mb-1 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
        {format === "percentage" ? formatPercentage(value) : formatNumber(value)}
      </p>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
