"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercentage } from "@/lib/utils";
import type { SocialPost } from "@/types/social";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Eye,
  TrendingUp,
  CalendarDays,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildFilterParams(filters: ReturnType<typeof useFilters>["filters"]): string {
  const params = new URLSearchParams();
  if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","));
  if (filters.contentTypes.length > 0) params.set("contentTypes", filters.contentTypes.join(","));
  if (filters.hookTypes.length > 0) params.set("hookTypes", filters.hookTypes.join(","));
  if (filters.dateRange) {
    params.set("dateFrom", filters.dateRange.from.toISOString());
    params.set("dateTo", filters.dateRange.to.toISOString());
  }
  if (filters.accounts.length > 0) params.set("accounts", filters.accounts.join(","));
  if (filters.minEngagementRate !== null) params.set("minEngagementRate", String(filters.minEngagementRate));
  if (filters.minViews !== null) params.set("minViews", String(filters.minViews));
  if (filters.hashtags.length > 0) params.set("hashtags", filters.hashtags.join(","));
  if (filters.searchQuery) params.set("searchQuery", filters.searchQuery);
  return params.toString();
}

/** UTC date string YYYY-MM-DD */
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Build a 6-row × 7-col calendar grid (weeks start Monday) for a given UTC month.
 * Cells outside the current month are filled from the adjacent months.
 */
function buildCalendarGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Monday-based: Mon=0 … Sun=6
  const startDow = (firstDay.getUTCDay() + 6) % 7;

  const allDays: Date[] = [];
  // Leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    allDays.push(new Date(Date.UTC(year, month, -i)));
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    allDays.push(new Date(Date.UTC(year, month, d)));
  }
  // Trailing days — ensure we always show 6 full rows (42 cells)
  while (allDays.length < 42) {
    const next = allDays.length - startDow - daysInMonth + 1;
    allDays.push(new Date(Date.UTC(year, month + 1, next)));
  }

  const grid: Date[][] = [];
  for (let row = 0; row < 6; row++) {
    grid.push(allDays.slice(row * 7, row * 7 + 7));
  }
  return grid;
}

// Max platform dots visible per day cell before "+N more"
const MAX_DOTS = 5;

// ---------------------------------------------------------------------------
// Compact post row shown in the day detail panel
// ---------------------------------------------------------------------------

function DayPostRow({ post }: { post: SocialPost }) {
  const config = PLATFORM_CONFIG[post.platform];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <PlatformIcon platform={post.platform} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {CONTENT_TYPE_LABELS[post.contentType]}
          </Badge>
          <Badge
            variant={post.engagementRate > 0.05 ? "success" : "secondary"}
            className="text-[10px]"
          >
            <TrendingUp className="mr-0.5 h-2.5 w-2.5" />
            {formatPercentage(post.engagementRate)} ER
          </Badge>
          {post.views > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              <Eye className="h-2.5 w-2.5" />
              {formatNumber(post.views)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-600 dark:text-zinc-400" title={post.hookText || post.caption}>
          {post.hookText || post.caption || "(no caption)"}
        </p>
      </div>
      {post.permalink && (
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          title="Open post"
          style={{ color: config.color }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { filters, refreshKey } = useFilters();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(() => today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(filters);
      const res = await fetch(`/api/posts?limit=2000&${params}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group posts by UTC date key
  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    for (const post of posts) {
      const key = dateKey(new Date(post.publishedAt));
      const existing = map.get(key) ?? [];
      existing.push(post);
      map.set(key, existing);
    }
    return map;
  }, [posts]);

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedPosts = useMemo(
    () => (selectedDate ? (postsByDate.get(selectedDate) ?? []) : []),
    [selectedDate, postsByDate]
  );

  // Posts in the currently-viewed month
  const monthPostCount = useMemo(() => {
    let total = 0;
    postsByDate.forEach((p, key) => {
      const d = new Date(key + "T00:00:00Z");
      if (d.getUTCFullYear() === viewYear && d.getUTCMonth() === viewMonth) total += p.length;
    });
    return total;
  }, [postsByDate, viewYear, viewMonth]);

  // Unique posting days in this month
  const monthActiveDays = useMemo(() => {
    let total = 0;
    postsByDate.forEach((p, key) => {
      const d = new Date(key + "T00:00:00Z");
      if (d.getUTCFullYear() === viewYear && d.getUTCMonth() === viewMonth) total += 1;
    });
    return total;
  }, [postsByDate, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  }

  function goToToday() {
    setViewYear(today.getUTCFullYear());
    setViewMonth(today.getUTCMonth());
    setSelectedDate(null);
  }

  const todayKey = dateKey(today);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Content Calendar</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            See what was posted on each day across all your accounts.
          </p>
        </div>
        {posts.length > 0 && (
          <div className="flex items-center gap-4 text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{monthPostCount}</p>
              <p>posts this month</p>
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{monthActiveDays}</p>
              <p>active days</p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar card */}
      <Card className="overflow-hidden">
        {/* Month navigation */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 py-3 dark:border-zinc-800">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </CardTitle>
            {(viewYear !== today.getUTCFullYear() || viewMonth !== today.getUTCMonth()) && (
              <button
                onClick={goToToday}
                className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
            {DAY_HEADERS.map((h) => (
              <div
                key={h}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {grid.map((week, wi) => (
              <div
                key={wi}
                className={cn(
                  "grid grid-cols-7",
                  wi < grid.length - 1 && "border-b border-zinc-100 dark:border-zinc-800"
                )}
              >
                {week.map((date) => {
                  const key = dateKey(date);
                  const dayPosts = postsByDate.get(key) ?? [];
                  const isCurrentMonth = date.getUTCMonth() === viewMonth;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(isSelected ? null : key)}
                      className={cn(
                        "relative flex min-h-[80px] flex-col items-start gap-1 p-2 text-left transition-colors",
                        // Column dividers
                        "border-r border-zinc-100 last:border-r-0 dark:border-zinc-800",
                        // Hover
                        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                        // Selected
                        isSelected && "bg-blue-50 dark:bg-blue-950/30",
                        // Outside current month
                        !isCurrentMonth && "opacity-40"
                      )}
                    >
                      {/* Day number */}
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday
                            ? "bg-blue-600 text-white"
                            : isSelected
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {date.getUTCDate()}
                      </span>

                      {/* Platform dots */}
                      {dayPosts.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {dayPosts.slice(0, MAX_DOTS).map((post, i) => (
                            <span
                              key={i}
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: PLATFORM_CONFIG[post.platform].color }}
                              title={`${PLATFORM_CONFIG[post.platform].label} — ${post.hookText || post.caption?.slice(0, 40) || ""}`}
                            />
                          ))}
                          {dayPosts.length > MAX_DOTS && (
                            <span className="text-[9px] font-medium leading-none text-zinc-400 dark:text-zinc-500 self-end">
                              +{dayPosts.length - MAX_DOTS}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Post count badge */}
                      {dayPosts.length > 0 && (
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                          {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Platform legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            {(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"] as const)
              .filter((p) => posts.some((post) => post.platform === p))
              .map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PLATFORM_CONFIG[p].color }}
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {PLATFORM_CONFIG[p].label}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      {selectedDate && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              {formatDayLabel(selectedDate)}
              <Badge variant="secondary">{selectedPosts.length} post{selectedPosts.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {selectedPosts.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No posts on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedPosts
                  .sort((a, b) => b.engagementRate - a.engagementRate)
                  .map((post) => (
                    <DayPostRow key={post.id} post={post} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <CalendarDays className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No posts found for the current filters.</p>
        </div>
      )}
    </div>
  );
}
