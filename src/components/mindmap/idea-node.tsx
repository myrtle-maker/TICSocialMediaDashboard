"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Pencil, Trash2, ArrowUpRight, CheckCircle } from "lucide-react";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS, HOOK_TYPE_LABELS } from "@/lib/constants";
import type { Platform, ContentType, HookType } from "@/types/social";

export interface IdeaNodeData {
  id: string;
  title: string;
  notes: string;
  platform: string | null;
  contentType: string | null;
  hookType: string | null;
  status: string;
  pillarColor: string;
  relatedPostCount: number;
  onEdit: (ideaId: string) => void;
  onDelete: (ideaId: string) => void;
  onPromote: (ideaId: string) => void;
}

function IdeaNodeComponent({ data }: { data: IdeaNodeData }) {
  const isPromoted = data.status === "promoted";

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-800"
      style={{
        width: 220,
        borderLeftColor: data.pillarColor,
        borderLeftWidth: 3,
      }}
    >
      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2 flex-1">
            {data.title}
          </p>
          {isPromoted && (
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          {data.platform && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {PLATFORM_CONFIG[data.platform as Platform]?.label ?? data.platform}
            </span>
          )}
          {data.contentType && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {CONTENT_TYPE_LABELS[data.contentType as ContentType] ?? data.contentType}
            </span>
          )}
          {data.hookType && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              {HOOK_TYPE_LABELS[data.hookType as HookType] ?? data.hookType}
            </span>
          )}
        </div>

        {/* Related posts count */}
        {data.relatedPostCount > 0 && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-2">
            {data.relatedPostCount} related post{data.relatedPostCount !== 1 ? "s" : ""}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 border-t border-zinc-100 dark:border-zinc-700 pt-1.5 mt-1">
          {!isPromoted && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onPromote(data.id); }}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
              title="Promote to scheduled post"
            >
              <ArrowUpRight className="h-3 w-3" />
              Schedule
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); data.onEdit(data.id); }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="Edit idea"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); data.onDelete(data.id); }}
            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
            title="Delete idea"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ background: data.pillarColor }} />
      <Handle type="source" position={Position.Right} style={{ background: "#a1a1aa" }} />
    </div>
  );
}

export const IdeaNode = memo(IdeaNodeComponent);
