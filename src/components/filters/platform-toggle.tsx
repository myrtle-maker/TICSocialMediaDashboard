"use client";

import type { Platform } from "@/types/social";
import { PLATFORMS, PLATFORM_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useFilters } from "./filter-context";

export function PlatformToggle() {
  const { filters, togglePlatform } = useFilters();

  return (
    <div className="flex flex-wrap gap-1.5">
      {PLATFORMS.map((platform) => {
        const config = PLATFORM_CONFIG[platform];
        const isActive =
          filters.platforms.length === 0 || filters.platforms.includes(platform);

        return (
          <button
            key={platform}
            onClick={() => togglePlatform(platform)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              isActive
                ? "border-transparent text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-600"
            )}
            style={
              isActive
                ? { backgroundColor: config.color }
                : undefined
            }
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
