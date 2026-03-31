"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS, HOOK_TYPE_LABELS } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SocialPost } from "@/types/social";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarClock,
  Target,
  Check,
  Minus,
  X,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SCHEDULE_GOALS = [
  {
    value: "engagement",
    label: "Maximise engagement",
    description: "Post on your highest-performing days with your best content types",
  },
  {
    value: "followers",
    label: "Grow followers",
    description: "Video-heavy schedule focused on reach and discovery",
  },
  {
    value: "views",
    label: "Increase views & reach",
    description: "Prioritise short-form video on your best-performing days",
  },
  {
    value: "consistency",
    label: "Posting consistency",
    description: "Even spread across the week to build a reliable posting habit",
  },
  {
    value: "instagram",
    label: "Instagram growth",
    description: "Posting schedule optimised for Instagram performance",
  },
  {
    value: "tiktok",
    label: "TikTok growth",
    description: "Posting schedule optimised for TikTok performance",
  },
  {
    value: "youtube",
    label: "YouTube growth",
    description: "Posting schedule optimised for YouTube performance",
  },
  {
    value: "linkedin",
    label: "LinkedIn growth",
    description: "Posting schedule optimised for LinkedIn performance",
  },
];

const FREQUENCY_OPTIONS = [
  { value: "3", label: "3× / week" },
  { value: "5", label: "5× / week" },
  { value: "7", label: "Daily (7× / week)" },
];

// Video-oriented content types — pushed to front for reach/growth goals
const VIDEO_CONTENT_TYPES = ["video", "reel", "short"];

// Platform preference by goal value
const GOAL_PLATFORM_OVERRIDE: Record<string, string | null> = {
  engagement: null,
  followers: null,
  views: null,
  consistency: null,
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  linkedin: "linkedin",
};

// Whether to prioritise video content types for a given goal
const GOAL_VIDEO_FIRST: Record<string, boolean> = {
  engagement: false,
  followers: true,
  views: true,
  consistency: false,
  instagram: false,
  tiktok: true,
  youtube: true,
  linkedin: false,
};

// Even weekly spread by posts/week (day-of-week indices, Mon=0)
const EVEN_SPREADS: Record<number, number[]> = {
  3: [0, 2, 4],       // Mon, Wed, Fri
  5: [0, 1, 2, 3, 4], // Weekdays
  7: [0, 1, 2, 3, 4, 5, 6], // Every day
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SuggestedSlot {
  date: string; // YYYY-MM-DD
  platform: string;
  contentType: string;
  hookType: string | null;
  hour: number; // UTC hour
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

function buildCalendarGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startDow = (firstDay.getUTCDay() + 6) % 7;

  const allDays: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    allDays.push(new Date(Date.UTC(year, month, -i)));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    allDays.push(new Date(Date.UTC(year, month, d)));
  }
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

function formatHourUTC(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

// ---------------------------------------------------------------------------
// Schedule generation
// ---------------------------------------------------------------------------

function generateSchedule(
  posts: SocialPost[],
  goal: string,
  postsPerWeek: number,
  year: number,
  month: number
): SuggestedSlot[] {
  const platformOverride = GOAL_PLATFORM_OVERRIDE[goal] ?? null;
  const videoFirst = GOAL_VIDEO_FIRST[goal] ?? false;
  const isEvenSpread = goal === "consistency";

  // Filter to relevant platform if goal is platform-specific
  const sourcePosts = platformOverride
    ? posts.filter((p) => p.platform === platformOverride)
    : posts;

  // Fall back to all posts if too few platform-specific posts
  const analysisPosts = sourcePosts.length >= 5 ? sourcePosts : posts;
  const rated = analysisPosts.filter((p) => p.engagementRate > 0);

  // --- Best days of week (Mon=0) ---
  const dayMap = new Map<number, { count: number; totalRate: number }>();
  for (const post of rated) {
    const dow = (new Date(post.publishedAt).getUTCDay() + 6) % 7;
    const e = dayMap.get(dow) ?? { count: 0, totalRate: 0 };
    e.count += 1;
    e.totalRate += post.engagementRate;
    dayMap.set(dow, e);
  }
  const rankedDays = Array.from(dayMap.entries())
    .map(([dow, d]) => ({ dow, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate);

  // Select which days of the week to post on
  let selectedDows: number[];
  if (isEvenSpread) {
    selectedDows = EVEN_SPREADS[postsPerWeek] ?? [0, 2, 4];
  } else {
    selectedDows = rankedDays
      .slice(0, postsPerWeek)
      .map((d) => d.dow)
      .sort((a, b) => a - b);
    // If we don't have enough data, fill remaining days evenly
    if (selectedDows.length < postsPerWeek) {
      const fallback = [0, 2, 4, 1, 3, 5, 6];
      for (const d of fallback) {
        if (!selectedDows.includes(d)) selectedDows.push(d);
        if (selectedDows.length >= postsPerWeek) break;
      }
      selectedDows.sort((a, b) => a - b);
    }
  }

  // --- Best content types ---
  const ctMap = new Map<string, { count: number; totalRate: number }>();
  for (const post of analysisPosts) {
    const e = ctMap.get(post.contentType) ?? { count: 0, totalRate: 0 };
    e.count += 1;
    const rate = post.engagementRate > 0 ? post.engagementRate : 0.01;
    e.totalRate += rate;
    ctMap.set(post.contentType, e);
  }
  let topContentTypes = Array.from(ctMap.entries())
    .map(([ct, d]) => ({ ct, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)
    .map((x) => x.ct);

  if (videoFirst) {
    topContentTypes = [
      ...topContentTypes.filter((ct) => VIDEO_CONTENT_TYPES.includes(ct)),
      ...topContentTypes.filter((ct) => !VIDEO_CONTENT_TYPES.includes(ct)),
    ];
  }

  if (topContentTypes.length === 0) topContentTypes = ["video"];

  // --- Best platforms (for rotation when no override) ---
  const platformMap = new Map<string, { count: number; totalRate: number }>();
  for (const post of analysisPosts) {
    const e = platformMap.get(post.platform) ?? { count: 0, totalRate: 0 };
    e.count += 1;
    const rate = post.engagementRate > 0 ? post.engagementRate : 0.01;
    e.totalRate += rate;
    platformMap.set(post.platform, e);
  }
  const topPlatforms = Array.from(platformMap.entries())
    .map(([pl, d]) => ({ pl, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)
    .map((x) => x.pl);
  const platformPool = platformOverride
    ? [platformOverride]
    : topPlatforms.slice(0, 3).length > 0
      ? topPlatforms.slice(0, 3)
      : ["instagram"];

  // --- Best hook type ---
  const hookMap = new Map<string, { count: number; totalRate: number }>();
  for (const post of rated) {
    if (!post.hookType || post.hookType === "other") continue;
    const e = hookMap.get(post.hookType) ?? { count: 0, totalRate: 0 };
    e.count += 1;
    e.totalRate += post.engagementRate;
    hookMap.set(post.hookType, e);
  }
  const topHook = Array.from(hookMap.entries())
    .map(([ht, d]) => ({ ht, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)[0]?.ht ?? null;

  // --- Best hour ---
  const hourMap = new Map<number, { count: number; totalRate: number }>();
  for (const post of rated) {
    const hour = new Date(post.publishedAt).getUTCHours();
    const e = hourMap.get(hour) ?? { count: 0, totalRate: 0 };
    e.count += 1;
    e.totalRate += post.engagementRate;
    hourMap.set(hour, e);
  }
  const bestHour = Array.from(hourMap.entries())
    .map(([h, d]) => ({ h, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)[0]?.h ?? 12;

  // Build reasoning string
  const goalLabel = SCHEDULE_GOALS.find((g) => g.value === goal)?.label ?? goal;
  const dataSource =
    sourcePosts.length >= 5 && platformOverride
      ? `${PLATFORM_CONFIG[platformOverride as keyof typeof PLATFORM_CONFIG]?.label ?? platformOverride}-specific data`
      : "cross-platform data";

  // --- Generate slots for the month ---
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const slots: SuggestedSlot[] = [];
  let slotIndex = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month, d));
    const dow = (date.getUTCDay() + 6) % 7;
    if (selectedDows.includes(dow)) {
      const contentType = topContentTypes[slotIndex % topContentTypes.length];
      const platform = platformPool[slotIndex % platformPool.length];
      slots.push({
        date: dateKey(date),
        platform,
        contentType,
        hookType: topHook,
        hour: bestHour,
        reasoning: `Suggested for "${goalLabel}" using ${dataSource}. ${DAY_NAMES_FULL[dow]} is one of your top-performing days.`,
      });
      slotIndex++;
    }
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const { filters, refreshKey } = useFilters();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(() => today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [goal, setGoal] = useState("engagement");
  const [postsPerWeek, setPostsPerWeek] = useState("5");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(filters);
      const res = await fetch(`/api/posts?limit=2000&${params}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const suggestedSlots = useMemo(
    () => generateSchedule(posts, goal, Number(postsPerWeek), viewYear, viewMonth),
    [posts, goal, postsPerWeek, viewYear, viewMonth]
  );

  const slotsByDate = useMemo(() => {
    const map = new Map<string, SuggestedSlot>();
    for (const slot of suggestedSlots) {
      map.set(slot.date, slot);
    }
    return map;
  }, [suggestedSlots]);

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedSlot = selectedDate ? slotsByDate.get(selectedDate) ?? null : null;
  const todayKey = dateKey(today);

  // Weekly template: which day-of-week (Mon=0) has a slot + what recommendation
  const weeklyTemplate = useMemo(() => {
    const template: (SuggestedSlot | null)[] = Array(7).fill(null);
    for (const slot of suggestedSlots) {
      const d = new Date(slot.date + "T00:00:00Z");
      const dow = (d.getUTCDay() + 6) % 7;
      if (!template[dow]) template[dow] = slot; // first example for each day
    }
    return template;
  }, [suggestedSlots]);

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

  const activeGoal = SCHEDULE_GOALS.find((g) => g.value === goal);

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
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Schedule Planner</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          AI-generated posting schedule built from your real performance data.
        </p>
      </div>

      {/* Goal + Frequency selectors */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-6">
            {/* Goal */}
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Target className="h-3.5 w-3.5" />
                Goal
              </label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeGoal && (
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {activeGoal.description}
                </p>
              )}
            </div>

            {/* Frequency */}
            <div className="min-w-[160px]">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <CalendarClock className="h-3.5 w-3.5" />
                Posting frequency
              </label>
              <Select value={postsPerWeek} onValueChange={setPostsPerWeek}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="flex items-end gap-6 text-xs text-zinc-500 dark:text-zinc-400 pb-0.5">
              <div className="text-right">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {suggestedSlots.length}
                </p>
                <p>posts suggested</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {posts.length > 0 ? posts.length.toLocaleString() : "—"}
                </p>
                <p>posts analysed</p>
              </div>
            </div>
          </div>

          {posts.length < 10 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Collect more posts for more accurate recommendations. Suggestions below are based on general best practices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="overflow-hidden">
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
          {/* Day headers */}
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

          {/* Grid */}
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
                  const slot = slotsByDate.get(key);
                  const isCurrentMonth = date.getUTCMonth() === viewMonth;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  const hasPast = date < today && !isToday;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(isSelected ? null : key)}
                      className={cn(
                        "relative flex min-h-[80px] flex-col gap-1 p-2 text-left transition-colors",
                        "border-r border-zinc-100 last:border-r-0 dark:border-zinc-800",
                        !isCurrentMonth && "opacity-35",
                        isSelected && slot
                          ? "bg-purple-50 dark:bg-purple-950/20"
                          : isSelected
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : slot
                              ? "hover:bg-purple-50/60 dark:hover:bg-purple-950/10"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      {/* Day number */}
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday
                            ? "bg-blue-600 text-white"
                            : isSelected
                              ? slot
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-blue-600 dark:text-blue-400"
                              : hasPast && slot
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {date.getUTCDate()}
                      </span>

                      {/* Suggested slot indicator */}
                      {slot && (
                        <div
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-md px-1.5 py-1",
                            hasPast
                              ? "bg-zinc-100 dark:bg-zinc-800"
                              : "bg-purple-100 dark:bg-purple-900/30"
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  PLATFORM_CONFIG[slot.platform as keyof typeof PLATFORM_CONFIG]
                                    ?.color ?? "#888",
                              }}
                            />
                            <span
                              className={cn(
                                "truncate text-[10px] font-medium",
                                hasPast
                                  ? "text-zinc-400 dark:text-zinc-500"
                                  : "text-purple-700 dark:text-purple-300"
                              )}
                            >
                              {PLATFORM_CONFIG[slot.platform as keyof typeof PLATFORM_CONFIG]?.label ?? slot.platform}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "truncate text-[9px]",
                              hasPast
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-purple-600/80 dark:text-purple-400/80"
                            )}
                          >
                            {CONTENT_TYPE_LABELS[slot.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? slot.contentType}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-purple-100 dark:bg-purple-900/30" />
              Suggested post
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
              Past suggested date
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day detail */}
      {selectedDate && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-purple-500" />
              {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </CardTitle>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {selectedSlot ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <PlatformIcon platform={selectedSlot.platform as SocialPost["platform"]} size="sm" />
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Platform</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {PLATFORM_CONFIG[selectedSlot.platform as keyof typeof PLATFORM_CONFIG]?.label ?? selectedSlot.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <span className="text-xs font-bold">CT</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Content type</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {CONTENT_TYPE_LABELS[selectedSlot.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? selectedSlot.contentType}
                      </p>
                    </div>
                  </div>
                  {selectedSlot.hookType && (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <span className="text-xs font-bold">H</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Hook type</p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {HOOK_TYPE_LABELS[selectedSlot.hookType as keyof typeof HOOK_TYPE_LABELS] ?? selectedSlot.hookType}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <span className="text-xs font-bold">⏰</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Best time</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatHourUTC(selectedSlot.hour)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedSlot.reasoning}</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                <p>No post suggested for this day. Adjust your frequency or goal to include it.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-purple-500" />
            Weekly Template
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {DAY_NAMES_FULL.map((day, i) => {
              const slot = weeklyTemplate[i];
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3",
                    slot ? "" : "opacity-50"
                  )}
                >
                  {/* Day name */}
                  <div className="w-24 shrink-0">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{day}</span>
                  </div>

                  {/* Post / No post indicator */}
                  {slot ? (
                    <Check className="h-4 w-4 shrink-0 text-purple-500" />
                  ) : (
                    <Minus className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                  )}

                  {slot ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Platform */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              PLATFORM_CONFIG[slot.platform as keyof typeof PLATFORM_CONFIG]?.color ?? "#888",
                          }}
                        />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          {PLATFORM_CONFIG[slot.platform as keyof typeof PLATFORM_CONFIG]?.label ?? slot.platform}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {CONTENT_TYPE_LABELS[slot.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? slot.contentType}
                      </Badge>
                      {slot.hookType && (
                        <Badge variant="outline" className="text-[10px]">
                          {HOOK_TYPE_LABELS[slot.hookType as keyof typeof HOOK_TYPE_LABELS] ?? slot.hookType} hook
                        </Badge>
                      )}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {formatHourUTC(slot.hour)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Rest day</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
