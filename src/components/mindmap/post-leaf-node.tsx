"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { Platform } from "@/types/social";

export interface PostLeafNodeData {
  id: string;
  platformPostId: string;
  platform: string;
  caption: string;
  engagementRate: number;
  views: number;
  thumbnailUrl: string | null;
  onOpen: (postId: string) => void;
}

function PostLeafNodeComponent({ data }: { data: PostLeafNodeData }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white shadow-sm cursor-pointer hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-zinc-400 transition-colors"
      style={{ width: 200 }}
      onClick={(e) => { e.stopPropagation(); data.onOpen(data.id); }}
      title="Click to view post"
    >
      {/* Thumbnail */}
      {data.thumbnailUrl ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-l-lg bg-zinc-100 dark:bg-zinc-800">
          <img
            src={data.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : (
        <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-l-lg bg-zinc-100 dark:bg-zinc-800">
          <PlatformIcon platform={data.platform as Platform} size="sm" />
        </div>
      )}

      <div className="min-w-0 flex-1 py-1.5 pr-2">
        <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-100 line-clamp-1 leading-tight">
          {data.caption.length > 60 ? data.caption.slice(0, 60) + "…" : data.caption}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {formatPercentage(data.engagementRate)} ER
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-500">·</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {formatNumber(data.views)} views
          </span>
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#a1a1aa" }} />
    </div>
  );
}

export const PostLeafNode = memo(PostLeafNodeComponent);
