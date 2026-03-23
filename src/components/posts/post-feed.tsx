"use client";

import { useState, useMemo, useCallback } from "react";
import type { SocialPost } from "@/types/social";
import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { PostComparisonModal } from "./post-comparison-modal";
import { FileX, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

interface PostFeedProps {
  posts: SocialPost[];
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

export function PostFeed({ posts, showLoadMore, onLoadMore }: PostFeedProps) {
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [compareSelection, setCompareSelection] = useState<SocialPost[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const avgER = useMemo(() => {
    if (posts.length === 0) return 5;
    const total = posts.reduce((sum, p) => sum + p.engagementRate, 0);
    return total / posts.length;
  }, [posts]);

  const handleCompare = useCallback((post: SocialPost) => {
    setCompareSelection((prev) => {
      // If already selected, remove it
      if (prev.some((p) => p.id === post.id)) {
        return prev.filter((p) => p.id !== post.id);
      }
      // If we already have 2, replace the second
      if (prev.length >= 2) {
        return [prev[0], post];
      }
      const next = [...prev, post];
      // Auto-open when 2 selected
      if (next.length === 2) {
        setTimeout(() => setComparisonOpen(true), 0);
      }
      return next;
    });
  }, []);

  const handleComparisonClose = useCallback(() => {
    setComparisonOpen(false);
    setCompareSelection([]);
  }, []);

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileX}
        title="No posts found"
        description="Try adjusting your filters or date range to find posts."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={setSelectedPost}
            onCompare={handleCompare}
            avgER={avgER}
            isSelectedForCompare={compareSelection.some((p) => p.id === post.id)}
          />
        ))}
      </div>

      {showLoadMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Load more posts
          </button>
        </div>
      )}

      {/* Floating comparison bar */}
      {compareSelection.length === 1 && !comparisonOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 shadow-lg dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              1 post selected for comparison. Select another to compare.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400"
              onClick={() => setCompareSelection([])}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <PostComparisonModal
        posts={posts}
        isOpen={comparisonOpen}
        onClose={handleComparisonClose}
        postA={compareSelection[0]}
        postB={compareSelection[1]}
      />
    </>
  );
}
