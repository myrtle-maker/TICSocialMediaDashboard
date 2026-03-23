"use client";

import type { Platform } from "@/types/social";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlatformBreakdownBarProps {
  data: { platform: Platform; value: number }[];
  label?: string;
}

export function PlatformBreakdownBar({
  data,
  label = "Engagement by Platform",
}: PlatformBreakdownBarProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">{label}</p>
      <div className="flex h-3 overflow-hidden rounded-full">
        <TooltipProvider delayDuration={100}>
          {data
            .filter((d) => d.value > 0)
            .map((d) => {
              const pct = (d.value / total) * 100;
              const config = PLATFORM_CONFIG[d.platform];
              return (
                <Tooltip key={d.platform}>
                  <TooltipTrigger asChild>
                    <div
                      className="transition-all hover:opacity-80"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: config.color,
                        minWidth: pct > 0 ? "4px" : 0,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {config.label}: {formatNumber(d.value)} ({pct.toFixed(1)}%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
        </TooltipProvider>
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {data
          .filter((d) => d.value > 0)
          .map((d) => {
            const config = PLATFORM_CONFIG[d.platform];
            return (
              <div key={d.platform} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-zinc-600">{config.label}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
