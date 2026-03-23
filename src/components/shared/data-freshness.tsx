"use client";

import { Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DataFreshnessProps {
  lastUpdated: Date | null;
}

export function DataFreshness({ lastUpdated }: DataFreshnessProps) {
  if (!lastUpdated) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
      <Clock className="h-3 w-3" />
      <span>Data last updated: {formatRelativeTime(lastUpdated)}</span>
    </div>
  );
}
