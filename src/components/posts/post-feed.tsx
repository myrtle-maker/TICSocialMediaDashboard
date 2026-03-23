"use client";

import { useState, useMemo } from "react";
import type { SocialPost } from "@/types/social";
import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { FileX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface PostFeedProps {
  posts: SocialPost[];
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

export function PostFeed({ posts, showLoadMore, onLoadMore }: PostFeedProps) {
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);

  const avgER = useMemo(() => {
    if (posts.length === 0) return 5;
    const total = posts.reduce((sum, p) => sum + p.engagementRate, 0);
    return total / posts.length;
  }, [posts]);

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
            avgER={avgER}
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

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}
