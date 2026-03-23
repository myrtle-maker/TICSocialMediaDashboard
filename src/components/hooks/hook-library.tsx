"use client";

import { useState, useEffect, useCallback } from "react";
import { useFilters } from "@/components/filters/filter-context";
import {
  PLATFORMS,
  PLATFORM_CONFIG,
  HOOK_TYPE_LABELS,
  HOOK_TYPE_COLORS,
  CONTENT_TYPE_LABELS,
} from "@/lib/constants";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Share2,
  TrendingUp,
  Inbox,
} from "lucide-react";
import type { Platform, HookType, ContentType } from "@/types/social";

interface HookItem {
  id: string;
  hookText: string;
  hookType: HookType;
  hookScore: number;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  engagementRate: number;
  views: number;
  likes: number;
  shares: number;
  saves: number;
  publishedAt: string;
  permalink: string;
}

const SORT_OPTIONS = [
  { value: "engagementRate", label: "Engagement Rate" },
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "shares", label: "Shares" },
  { value: "hookScore", label: "Hook Score" },
];

export function HookLibrary() {
  const { refreshKey } = useFilters();

  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [hookType, setHookType] = useState("all");
  const [sortBy, setSortBy] = useState("engagementRate");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      if (hookType !== "all") params.set("hookType", hookType);
      if (search.trim()) params.set("search", search.trim());
      params.set("sortBy", sortBy);
      params.set("limit", "50");

      const res = await fetch(`/api/hooks/library?${params.toString()}`);
      const data = await res.json();
      setHooks(data.hooks ?? []);
    } catch (err) {
      console.error("Failed to fetch hook library:", err);
      setHooks([]);
    } finally {
      setLoading(false);
    }
  }, [platform, hookType, search, sortBy, refreshKey]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchHooks();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchHooks]);

  const handleCopy = async (hookText: string, id: string) => {
    try {
      await navigator.clipboard.writeText(hookText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = hookText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search hooks by text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={hookType} onValueChange={setHookType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Hook Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(HOOK_TYPE_LABELS) as HookType[]).map((ht) => (
              <SelectItem key={ht} value={ht}>
                {HOOK_TYPE_LABELS[ht]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hook cards grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No hooks found for this filter.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Try broadening your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hooks.map((hook) => (
            <Card
              key={hook.id}
              className="group border border-zinc-200 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              <CardContent className="p-4">
                {/* Hook text */}
                <p className="mb-3 text-base font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                  &ldquo;{hook.hookText}&rdquo;
                </p>

                {/* Badges row */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor:
                        HOOK_TYPE_COLORS[hook.hookType] + "20",
                      color: HOOK_TYPE_COLORS[hook.hookType],
                      borderColor: HOOK_TYPE_COLORS[hook.hookType] + "40",
                    }}
                  >
                    {HOOK_TYPE_LABELS[hook.hookType]}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={hook.platform} size="sm" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {PLATFORM_CONFIG[hook.platform].label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {CONTENT_TYPE_LABELS[hook.contentType]}
                  </Badge>
                </div>

                {/* Metrics row */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    {formatPercentage(hook.engagementRate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(hook.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatNumber(hook.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    {formatNumber(hook.shares)}
                  </span>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => handleCopy(hook.hookText, hook.id)}
                  >
                    {copiedId === hook.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                  {hook.permalink && (
                    <a
                      href={hook.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Post
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
