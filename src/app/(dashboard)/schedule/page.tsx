"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useFilters } from "@/components/filters/filter-context";
import {
  PLATFORM_CONFIG,
  CONTENT_TYPE_LABELS,
  HOOK_TYPE_LABELS,
  PLATFORMS,
} from "@/lib/constants";
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
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  Ban,
  Sparkles,
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

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, "0")}:00 UTC`,
}));

const STATUS_CONFIG = {
  planned: {
    label: "Planned",
    icon: Clock,
    className: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    className: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "text-zinc-400 bg-zinc-100 dark:text-zinc-500 dark:bg-zinc-800",
  },
};

const SCHEDULE_GOALS = [
  { value: "engagement", label: "Maximise engagement" },
  { value: "followers", label: "Grow followers" },
  { value: "views", label: "Increase views & reach" },
  { value: "consistency", label: "Posting consistency" },
  { value: "instagram", label: "Instagram growth" },
  { value: "tiktok", label: "TikTok growth" },
  { value: "youtube", label: "YouTube growth" },
  { value: "linkedin", label: "LinkedIn growth" },
];

const FREQUENCY_OPTIONS = [
  { value: "3", label: "3× / week" },
  { value: "5", label: "5× / week" },
  { value: "7", label: "Daily" },
];

const VIDEO_CONTENT_TYPES = ["video", "reel", "short"];

const GOAL_PLATFORM_OVERRIDE: Record<string, string | null> = {
  engagement: null, followers: null, views: null, consistency: null,
  instagram: "instagram", tiktok: "tiktok", youtube: "youtube", linkedin: "linkedin",
};
const GOAL_VIDEO_FIRST: Record<string, boolean> = {
  engagement: false, followers: true, views: true, consistency: false,
  instagram: false, tiktok: true, youtube: true, linkedin: false,
};
const EVEN_SPREADS: Record<number, number[]> = {
  3: [0, 2, 4], 5: [0, 1, 2, 3, 4], 7: [0, 1, 2, 3, 4, 5, 6],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledPost {
  id: string;
  platform: string;
  contentType: string;
  hookType: string | null;
  caption: string;
  notes: string;
  scheduledAt: string; // ISO string
  status: "planned" | "published" | "cancelled";
}

interface Suggestion {
  date: string;
  platform: string;
  contentType: string;
  hookType: string | null;
  hour: number;
}

interface FormState {
  platform: string;
  contentType: string;
  hookType: string;
  caption: string;
  notes: string;
  hour: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
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

function scheduledAtFromDayHour(dateStr: string, hour: number): string {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00.000Z`).toISOString();
}

function hourFromScheduledAt(iso: string): number {
  return new Date(iso).getUTCHours();
}

// ---------------------------------------------------------------------------
// Suggestion generation — per-platform schedules that can overlap on the same day
// ---------------------------------------------------------------------------

function bestDowsForPosts(
  posts: SocialPost[],
  count: number,
  isEvenSpread: boolean
): number[] {
  if (isEvenSpread) return EVEN_SPREADS[count] ?? [0, 2, 4];

  const dayMap = new Map<number, { count: number; totalRate: number }>();
  for (const post of posts.filter((p) => p.engagementRate > 0)) {
    const dow = (new Date(post.publishedAt).getUTCDay() + 6) % 7;
    const e = dayMap.get(dow) ?? { count: 0, totalRate: 0 };
    e.count += 1; e.totalRate += post.engagementRate;
    dayMap.set(dow, e);
  }
  const ranked = Array.from(dayMap.entries())
    .map(([dow, d]) => ({ dow, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)
    .map((x) => x.dow);
  const selected = ranked.slice(0, count);
  // Fill up with any missing days if not enough data
  for (const d of [0, 2, 4, 1, 3, 5, 6]) {
    if (selected.length >= count) break;
    if (!selected.includes(d)) selected.push(d);
  }
  return selected.slice(0, count).sort((a, b) => a - b);
}

function bestContentTypeForPosts(posts: SocialPost[], videoFirst: boolean): string[] {
  const ctMap = new Map<string, { count: number; totalRate: number }>();
  for (const post of posts) {
    const e = ctMap.get(post.contentType) ?? { count: 0, totalRate: 0 };
    e.count += 1; e.totalRate += post.engagementRate > 0 ? post.engagementRate : 0.01;
    ctMap.set(post.contentType, e);
  }
  let types = Array.from(ctMap.entries())
    .map(([ct, d]) => ({ ct, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)
    .map((x) => x.ct);
  if (videoFirst) {
    types = [
      ...types.filter((ct) => VIDEO_CONTENT_TYPES.includes(ct)),
      ...types.filter((ct) => !VIDEO_CONTENT_TYPES.includes(ct)),
    ];
  }
  return types.length > 0 ? types : ["video"];
}

function bestHookForPosts(posts: SocialPost[]): string | null {
  const hookMap = new Map<string, { count: number; totalRate: number }>();
  for (const post of posts.filter((p) => p.engagementRate > 0)) {
    if (!post.hookType || post.hookType === "other") continue;
    const e = hookMap.get(post.hookType) ?? { count: 0, totalRate: 0 };
    e.count += 1; e.totalRate += post.engagementRate;
    hookMap.set(post.hookType, e);
  }
  return Array.from(hookMap.entries())
    .map(([ht, d]) => ({ ht, avgRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgRate - a.avgRate)[0]?.ht ?? null;
}

function bestHourForPosts(posts: SocialPost[]): number {
  const hourMap = new Map<number, { count: number; totalRate: number }>();
  for (const post of posts.filter((p) => p.engagementRate > 0)) {
    const hour = new Date(post.publishedAt).getUTCHours();
    const e = hourMap.get(hour) ?? { count: 0, totalRate: 0 };
    e.count += 1; e.totalRate += post.engagementRate;
    hourMap.set(hour, e);
  }
  return (
    Array.from(hourMap.entries())
      .map(([h, d]) => ({ h, avgRate: d.totalRate / d.count }))
      .sort((a, b) => b.avgRate - a.avgRate)[0]?.h ?? 12
  );
}

function generateSuggestions(
  posts: SocialPost[],
  goal: string,
  postsPerWeek: number,
  year: number,
  month: number
): Suggestion[] {
  if (posts.length === 0) return [];

  const platformOverride = GOAL_PLATFORM_OVERRIDE[goal] ?? null;
  const videoFirst = GOAL_VIDEO_FIRST[goal] ?? false;
  const isEvenSpread = goal === "consistency";

  // Determine which platforms to generate schedules for
  let targetPlatforms: string[];
  if (platformOverride) {
    targetPlatforms = [platformOverride];
  } else {
    // Rank platforms by avg engagement rate, require at least 2 posts
    const platformMap = new Map<string, { count: number; totalRate: number }>();
    for (const post of posts.filter((p) => p.engagementRate > 0)) {
      const e = platformMap.get(post.platform) ?? { count: 0, totalRate: 0 };
      e.count += 1; e.totalRate += post.engagementRate;
      platformMap.set(post.platform, e);
    }
    targetPlatforms = Array.from(platformMap.entries())
      .filter(([, d]) => d.count >= 2)
      .map(([pl, d]) => ({ pl, avgRate: d.totalRate / d.count }))
      .sort((a, b) => b.avgRate - a.avgRate)
      .slice(0, 3)
      .map((x) => x.pl);
    if (targetPlatforms.length === 0) targetPlatforms = ["instagram"];
  }

  const numPlatforms = targetPlatforms.length;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const allSuggestions: Suggestion[] = [];

  for (let pi = 0; pi < numPlatforms; pi++) {
    const platform = targetPlatforms[pi];
    // Distribute total posts/week across platforms (round-robin the remainder to higher-ranked platforms)
    const platformPostsPerWeek = Math.floor(postsPerWeek / numPlatforms) + (pi < postsPerWeek % numPlatforms ? 1 : 0);
    if (platformPostsPerWeek === 0) continue;

    // Use platform-specific posts for analysis; fall back to all posts if too few
    const platformPosts = posts.filter((p) => p.platform === platform);
    const analysisPosts = platformPosts.length >= 3 ? platformPosts : posts;

    const selectedDows = bestDowsForPosts(analysisPosts, platformPostsPerWeek, isEvenSpread);
    const topContentTypes = bestContentTypeForPosts(analysisPosts, videoFirst);
    const topHook = bestHookForPosts(analysisPosts);
    const bestHour = bestHourForPosts(analysisPosts);

    let ctIdx = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month, d));
      const dow = (date.getUTCDay() + 6) % 7;
      if (selectedDows.includes(dow)) {
        allSuggestions.push({
          date: dateKey(date),
          platform,
          contentType: topContentTypes[ctIdx % topContentTypes.length],
          hookType: topHook,
          hour: bestHour,
        });
        ctIdx++;
      }
    }
  }

  return allSuggestions;
}

// ---------------------------------------------------------------------------
// Post form (create / edit)
// ---------------------------------------------------------------------------

const EMPTY_FORM: FormState = {
  platform: "",
  contentType: "",
  hookType: "none",
  caption: "",
  notes: "",
  hour: "12",
  status: "planned",
};

function PostForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (form: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (key: keyof FormState, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const valid = form.platform && form.contentType;

  return (
    <div className="space-y-3">
      {/* Platform */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Platform <span className="text-red-500">*</span>
        </label>
        <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Content type <span className="text-red-500">*</span>
        </label>
        <Select value={form.contentType} onValueChange={(v) => set("contentType", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTENT_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hook type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Hook type
        </label>
        <Select value={form.hookType} onValueChange={(v) => set("hookType", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {Object.entries(HOOK_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Time (UTC)
        </label>
        <Select value={form.hour} onValueChange={(v) => set("hour", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {HOURS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Caption */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Caption / copy
        </label>
        <textarea
          value={form.caption}
          onChange={(e) => set("caption", e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Draft caption or key messages…"
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Internal notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Visual direction, links, reminders…"
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500"
        />
      </div>

      {/* Status (only show when editing) */}
      {initial.status !== "planned" || initial.platform !== "" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Status
          </label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!valid || saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const { filters, refreshKey } = useFilters();

  // Analytics posts (for suggestions)
  const [analyticsPosts, setAnalyticsPosts] = useState<SocialPost[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(() => today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getUTCMonth());

  // Panel state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // AI suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionGoal, setSuggestionGoal] = useState("engagement");
  const [suggestionFreq, setSuggestionFreq] = useState("5");

  // Fetch analytics posts
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","));
      const res = await fetch(`/api/posts?limit=2000&${params}`);
      const data = await res.json();
      setAnalyticsPosts(data.posts ?? []);
    } catch {
      // silently fail — suggestions just won't be data-driven
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filters.platforms, refreshKey]);

  // Fetch scheduled posts for the viewed month (+/- 1 month buffer)
  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const from = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).toISOString();
      const to = new Date(Date.UTC(viewYear, viewMonth + 2, 0)).toISOString();
      const res = await fetch(`/api/schedule?from=${from}&to=${to}`);
      const data = await res.json();
      setScheduledPosts(data.posts ?? []);
    } catch {
      setScheduledPosts([]);
    } finally {
      setScheduledLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  // AI suggestions for this month
  const suggestions = useMemo(
    () =>
      showSuggestions
        ? generateSuggestions(
            analyticsPosts,
            suggestionGoal,
            Number(suggestionFreq),
            viewYear,
            viewMonth
          )
        : [],
    [showSuggestions, analyticsPosts, suggestionGoal, suggestionFreq, viewYear, viewMonth]
  );

  const suggestionsByDate = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const existing = map.get(s.date) ?? [];
      existing.push(s);
      map.set(s.date, existing);
    }
    return map;
  }, [suggestions]);

  // Group scheduled posts by date
  const scheduledByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of scheduledPosts) {
      const key = new Date(post.scheduledAt).toISOString().slice(0, 10);
      const existing = map.get(key) ?? [];
      existing.push(post);
      map.set(key, existing);
    }
    return map;
  }, [scheduledPosts]);

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedScheduledPosts = useMemo(
    () => (selectedDate ? scheduledByDate.get(selectedDate) ?? [] : []),
    [selectedDate, scheduledByDate]
  );
  const selectedSuggestions = useMemo(
    () => (selectedDate ? suggestionsByDate.get(selectedDate) ?? [] : []),
    [selectedDate, suggestionsByDate]
  );

  const monthPostCount = useMemo(() => {
    let total = 0;
    scheduledByDate.forEach((posts, key) => {
      const d = new Date(key + "T00:00:00Z");
      if (d.getUTCFullYear() === viewYear && d.getUTCMonth() === viewMonth) total += posts.length;
    });
    return total;
  }, [scheduledByDate, viewYear, viewMonth]);

  // Month navigation
  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null); setEditingPost(null); setShowAddForm(false);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null); setEditingPost(null); setShowAddForm(false);
  }
  function goToToday() {
    setViewYear(today.getUTCFullYear()); setViewMonth(today.getUTCMonth());
    setSelectedDate(null); setEditingPost(null); setShowAddForm(false);
  }

  function openDay(key: string) {
    if (selectedDate === key && !showAddForm && !editingPost) {
      setSelectedDate(null);
    } else {
      setSelectedDate(key);
      setEditingPost(null);
      setShowAddForm(false);
    }
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  // CRUD
  async function handleCreate(form: FormState) {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          contentType: form.contentType,
          hookType: form.hookType === "none" ? null : form.hookType,
          caption: form.caption,
          notes: form.notes,
          scheduledAt: scheduledAtFromDayHour(selectedDate, Number(form.hour)),
        }),
      });
      const data = await res.json();
      if (data.post) {
        setScheduledPosts((prev) => [...prev, data.post]);
        setShowAddForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(form: FormState) {
    if (!editingPost) return;
    setSaving(true);
    try {
      const dateStr = new Date(editingPost.scheduledAt).toISOString().slice(0, 10);
      const res = await fetch(`/api/schedule/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          contentType: form.contentType,
          hookType: form.hookType === "none" ? null : form.hookType,
          caption: form.caption,
          notes: form.notes,
          scheduledAt: scheduledAtFromDayHour(dateStr, Number(form.hour)),
          status: form.status,
        }),
      });
      const data = await res.json();
      if (data.post) {
        setScheduledPosts((prev) =>
          prev.map((p) => (p.id === data.post.id ? data.post : p))
        );
        setEditingPost(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
      if (editingPost?.id === id) setEditingPost(null);
    } finally {
      setDeleting(null);
    }
  }

  async function handleStatusToggle(post: ScheduledPost) {
    const nextStatus =
      post.status === "planned" ? "published" : post.status === "published" ? "cancelled" : "planned";
    const res = await fetch(`/api/schedule/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (data.post) {
      setScheduledPosts((prev) => prev.map((p) => (p.id === data.post.id ? data.post : p)));
    }
  }

  // Accept an AI suggestion → prefill the create form
  function acceptSuggestion(s: Suggestion) {
    setShowAddForm(true);
    setEditingPost(null);
    // Pre-fill will be picked up by the form key trick below
    setAcceptedSuggestion(s);
  }
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<Suggestion | null>(null);

  const todayKey = dateKey(today);

  const addFormInitial: FormState = acceptedSuggestion
    ? {
        platform: acceptedSuggestion.platform,
        contentType: acceptedSuggestion.contentType,
        hookType: acceptedSuggestion.hookType ?? "none",
        caption: "",
        notes: "",
        hour: String(acceptedSuggestion.hour),
        status: "planned",
      }
    : EMPTY_FORM;

  const loading = analyticsLoading || scheduledLoading;

  if (loading && scheduledPosts.length === 0) {
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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Schedule Planner</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Plan and manage your content schedule. Click any day to add a post.
          </p>
        </div>
        {monthPostCount > 0 && (
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{monthPostCount}</p>
            <p>scheduled this month</p>
          </div>
        )}
      </div>

      {/* AI Suggestions toggle */}
      <Card>
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              AI Suggestions
            </span>
            {showSuggestions && (
              <Badge variant="secondary" className="text-[10px]">
                {suggestions.length} suggested
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-400 transition-transform",
              showSuggestions && "rotate-180"
            )}
          />
        </button>

        {showSuggestions && (
          <CardContent className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Suggestions are generated from your historical performance data and shown on the
              calendar as dashed outlines. Click any suggestion to add it to your schedule.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Target className="h-3 w-3" />
                  Goal
                </label>
                <Select value={suggestionGoal} onValueChange={setSuggestionGoal}>
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
              </div>
              <div className="min-w-[150px]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <CalendarClock className="h-3 w-3" />
                  Frequency
                </label>
                <Select value={suggestionFreq} onValueChange={setSuggestionFreq}>
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
            </div>
          </CardContent>
        )}
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
                  const dayPosts = scheduledByDate.get(key) ?? [];
                  const daySuggestions = suggestionsByDate.get(key) ?? [];
                  const hasSuggestion = daySuggestions.length > 0 && showSuggestions;
                  const isCurrentMonth = date.getUTCMonth() === viewMonth;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={key}
                      onClick={() => openDay(key)}
                      className={cn(
                        "relative flex min-h-[90px] flex-col gap-1 p-2 text-left transition-colors",
                        "border-r border-zinc-100 last:border-r-0 dark:border-zinc-800",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                        isSelected && "bg-zinc-50 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-800/60 dark:ring-zinc-600",
                        !isCurrentMonth && "opacity-40"
                      )}
                    >
                      {/* Day number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            isToday
                              ? "bg-blue-600 text-white"
                              : isSelected
                                ? "text-zinc-900 dark:text-zinc-100"
                                : "text-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          {date.getUTCDate()}
                        </span>
                        {isCurrentMonth && (
                          <Plus className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600" />
                        )}
                      </div>

                      {/* Scheduled posts */}
                      {dayPosts.map((post) => {
                        const config = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                        const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned;
                        return (
                          <div
                            key={post.id}
                            className={cn(
                              "flex w-full items-center gap-1 rounded px-1.5 py-0.5",
                              post.status === "cancelled"
                                ? "bg-zinc-100 opacity-50 dark:bg-zinc-800"
                                : post.status === "published"
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-white shadow-sm dark:bg-zinc-900"
                            )}
                            style={{
                              borderLeft: `2px solid ${config?.color ?? "#888"}`,
                            }}
                          >
                            <span
                              className="truncate text-[10px] font-medium"
                              style={{
                                color:
                                  post.status === "cancelled"
                                    ? undefined
                                    : (config?.color ?? "#333"),
                                textDecoration:
                                  post.status === "cancelled" ? "line-through" : undefined,
                              }}
                            >
                              {config?.label ?? post.platform}
                            </span>
                            <span className="ml-auto shrink-0">
                              {post.status === "published" ? (
                                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                              ) : post.status === "cancelled" ? (
                                <Ban className="h-2.5 w-2.5 text-zinc-400" />
                              ) : (
                                <Clock className="h-2.5 w-2.5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* AI suggestion ghosts — one per platform */}
                      {hasSuggestion && daySuggestions.map((s, si) => (
                        <div
                          key={si}
                          className="flex w-full items-center gap-1 rounded border border-dashed border-purple-300 px-1.5 py-0.5 dark:border-purple-700"
                          title="AI suggestion — click day to add"
                        >
                          <Sparkles className="h-2.5 w-2.5 shrink-0 text-purple-400" />
                          <span className="truncate text-[10px] text-purple-500 dark:text-purple-400">
                            {PLATFORM_CONFIG[s.platform as keyof typeof PLATFORM_CONFIG]?.label ?? s.platform}
                          </span>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Planned
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Published
            </div>
            <div className="flex items-center gap-1.5">
              <Ban className="h-3 w-3 text-zinc-400" />
              Cancelled
            </div>
            {showSuggestions && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-400" />
                AI suggestion
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day panel */}
      {selectedDate && (
        <Card ref={panelRef}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-zinc-500" />
              {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
              {selectedScheduledPosts.length > 0 && (
                <Badge variant="secondary">
                  {selectedScheduledPosts.length} post{selectedScheduledPosts.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {!showAddForm && !editingPost && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingPost(null);
                    setAcceptedSuggestion(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add post
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setEditingPost(null);
                  setShowAddForm(false);
                }}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Existing scheduled posts */}
            {selectedScheduledPosts.length > 0 && (
              <div className="space-y-2">
                {selectedScheduledPosts.map((post) => {
                  const config = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                  const isEditing = editingPost?.id === post.id;
                  const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div key={post.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                      {isEditing ? (
                        <div className="p-4">
                          <p className="mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Editing post
                          </p>
                          <PostForm
                            initial={{
                              platform: post.platform,
                              contentType: post.contentType,
                              hookType: post.hookType ?? "none",
                              caption: post.caption,
                              notes: post.notes,
                              hour: String(hourFromScheduledAt(post.scheduledAt)),
                              status: post.status,
                            }}
                            onSave={handleUpdate}
                            onCancel={() => setEditingPost(null)}
                            saving={saving}
                          />
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-3">
                          <PlatformIcon platform={post.platform as SocialPost["platform"]} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold" style={{ color: config?.color }}>
                                {config?.label ?? post.platform}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {CONTENT_TYPE_LABELS[post.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? post.contentType}
                              </Badge>
                              {post.hookType && (
                                <Badge variant="outline" className="text-[10px]">
                                  {HOOK_TYPE_LABELS[post.hookType as keyof typeof HOOK_TYPE_LABELS] ?? post.hookType}
                                </Badge>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                {new Date(post.scheduledAt).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "UTC",
                                })} UTC
                              </span>
                            </div>
                            {post.caption && (
                              <p className="mb-0.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                {post.caption}
                              </p>
                            )}
                            {post.notes && (
                              <p className="text-[11px] italic text-zinc-400 dark:text-zinc-500 line-clamp-1">
                                {post.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {/* Status toggle */}
                            <button
                              onClick={() => handleStatusToggle(post)}
                              className={cn(
                                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                                statusCfg.className
                              )}
                              title="Click to cycle status"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </button>
                            <button
                              onClick={() => { setEditingPost(post); setShowAddForm(false); }}
                              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              disabled={deleting === post.id}
                              className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                            >
                              {deleting === post.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI suggestions for this day — one banner per platform */}
            {selectedSuggestions.length > 0 && !showAddForm && !editingPost && (
              <div className="space-y-2">
                {selectedSuggestions.map((s, si) => (
                  <div
                    key={si}
                    className="flex items-center justify-between rounded-lg border border-dashed border-purple-300 bg-purple-50/50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 shrink-0 text-purple-500" />
                      <div>
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {PLATFORM_CONFIG[s.platform as keyof typeof PLATFORM_CONFIG]?.label ?? s.platform}
                          {" · "}
                          {CONTENT_TYPE_LABELS[s.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? s.contentType}
                          {s.hookType &&
                            ` · ${HOOK_TYPE_LABELS[s.hookType as keyof typeof HOOK_TYPE_LABELS] ?? s.hookType} hook`}
                        </p>
                        <p className="text-[11px] text-purple-500 dark:text-purple-400">
                          Best time: {String(s.hour).padStart(2, "0")}:00 UTC
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => acceptSuggestion(s)}
                      className="shrink-0 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                    >
                      Use this
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            {showAddForm && !editingPost && (
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  New post
                </p>
                <PostForm
                  key={acceptedSuggestion?.date ?? "new"}
                  initial={addFormInitial}
                  onSave={handleCreate}
                  onCancel={() => { setShowAddForm(false); setAcceptedSuggestion(null); }}
                  saving={saving}
                />
              </div>
            )}

            {/* Empty state */}
            {selectedScheduledPosts.length === 0 && !showAddForm && !editingPost && selectedSuggestions.length === 0 && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                No posts scheduled for this day.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
