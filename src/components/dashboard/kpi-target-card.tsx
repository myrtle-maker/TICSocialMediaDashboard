"use client";

import type { KpiProgressItem } from "@/app/api/analytics/kpi-progress/route";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import { X } from "lucide-react";

const METRIC_LABELS: Record<string, string> = {
  engagementRate: "Avg Engagement Rate",
  views: "Total Views",
  likes: "Total Likes",
  comments: "Total Comments",
  shares: "Total Shares",
  saves: "Total Saves",
  posts: "Total Posts",
};

function formatValue(metric: string, value: number): string {
  if (metric === "engagementRate") return formatPercentage(value);
  return formatNumber(value);
}

interface KpiTargetCardProps {
  item: KpiProgressItem;
  onDelete?: (id: string) => void;
}

export function KpiTargetCard({ item, onDelete }: KpiTargetCardProps) {
  const label = METRIC_LABELS[item.metric] ?? item.metric;
  const platformLabel = item.platform
    ? PLATFORM_CONFIG[item.platform as Platform]?.label ?? item.platform
    : "All Platforms";

  const barColor = item.progress >= 100
    ? "bg-emerald-500"
    : item.progress >= 80
      ? "bg-blue-500"
      : item.progress >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  const statusText = item.progress >= 100
    ? "Target reached"
    : item.onTrack
      ? "On track"
      : "Behind";

  const statusColor = item.progress >= 100
    ? "text-emerald-600 dark:text-emerald-400"
    : item.onTrack
      ? "text-blue-600 dark:text-blue-400"
      : "text-red-500 dark:text-red-400";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">
            {platformLabel} &middot; {item.period}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 rounded p-0.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
            title="Remove target"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mb-1.5 flex items-end justify-between">
        <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatValue(item.metric, item.actual)}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          / {formatValue(item.metric, item.target)}
        </span>
      </div>

      <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${item.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.progress}%</span>
      </div>
    </div>
  );
}
