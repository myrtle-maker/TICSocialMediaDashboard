"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTargetCard, METRIC_LABELS, formatValue } from "@/components/dashboard/kpi-target-card";
import type { KpiProgressItem } from "@/app/api/analytics/kpi-progress/route";
import type { TargetSuggestion } from "@/app/api/analytics/target-suggestions/route";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import {
  Target,
  Sparkles,
  Plus,
  Loader2,
  TrendingUp,
  Heart,
  CalendarDays,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Goal templates
// ---------------------------------------------------------------------------

interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  metrics: { metric: string; period: "weekly" | "monthly" | "quarterly" }[];
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "grow-reach",
    name: "Grow Reach",
    description: "Increase content visibility and total views across all platforms.",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    metrics: [
      { metric: "views", period: "monthly" },
      { metric: "posts", period: "weekly" },
    ],
  },
  {
    id: "improve-engagement",
    name: "Improve Engagement",
    description: "Drive deeper audience interaction — more comments, saves, and reactions.",
    icon: Heart,
    color: "text-rose-600 dark:text-rose-400",
    metrics: [
      { metric: "engagementRate", period: "monthly" },
      { metric: "comments", period: "monthly" },
      { metric: "saves", period: "monthly" },
    ],
  },
  {
    id: "content-consistency",
    name: "Content Consistency",
    description: "Build a regular posting cadence — weekly and monthly volume targets.",
    icon: CalendarDays,
    color: "text-amber-600 dark:text-amber-400",
    metrics: [
      { metric: "posts", period: "weekly" },
      { metric: "posts", period: "monthly" },
    ],
  },
  {
    id: "virality-push",
    name: "Virality Push",
    description: "Maximise shares and organic spread beyond your existing audience.",
    icon: Share2,
    color: "text-purple-600 dark:text-purple-400",
    metrics: [
      { metric: "shares", period: "monthly" },
      { metric: "views", period: "monthly" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_METRICS = ["engagementRate", "views", "likes", "comments", "shares", "saves", "posts"] as const;
const VALID_PERIODS = ["weekly", "monthly", "quarterly"] as const;
const PLATFORMS = ["", "tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  const [progress, setProgress] = useState<KpiProgressItem[]>([]);
  const [suggestions, setSuggestions] = useState<TargetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Smart suggest selections: metric+period key → "achievable" | "stretch" | null
  const [suggestSelections, setSuggestSelections] = useState<Record<string, "achievable" | "stretch" | null>>({});
  const [applyingSuggestions, setApplyingSuggestions] = useState(false);

  // Custom form
  const [customMetric, setCustomMetric] = useState<string>("views");
  const [customPeriod, setCustomPeriod] = useState<string>("monthly");
  const [customPlatform, setCustomPlatform] = useState<string>("");
  const [customTarget, setCustomTarget] = useState<string>("");

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/kpi-progress");
      const data = await res.json();
      setProgress(data.progress ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/kpi-targets?id=${id}`, { method: "DELETE" });
    await loadProgress();
  };

  // Smart suggest
  const handleLoadSuggestions = async () => {
    if (suggestions.length > 0) { setSuggestOpen(true); return; }
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/analytics/target-suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setSuggestOpen(true);
    } catch { /* ignore */ }
    finally { setSuggestLoading(false); }
  };

  const handleApplySuggestions = async () => {
    const toCreate = Object.entries(suggestSelections)
      .filter(([, v]) => v !== null)
      .map(([key, choice]) => {
        const [metric, period] = key.split("|");
        const suggestion = suggestions.find((s) => s.metric === metric && s.period === period);
        if (!suggestion) return null;
        return { metric, period, platform: null, target: choice === "stretch" ? suggestion.stretch : suggestion.achievable };
      })
      .filter(Boolean);

    if (toCreate.length === 0) return;

    setApplyingSuggestions(true);
    try {
      await Promise.all(
        toCreate.map((t) =>
          fetch("/api/kpi-targets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(t),
          })
        )
      );
      setSuggestSelections({});
      setSuggestOpen(false);
      await loadProgress();
    } catch { /* ignore */ }
    finally { setApplyingSuggestions(false); }
  };

  // Goal template apply
  const handleApplyTemplate = async (template: GoalTemplate) => {
    // Get suggestions if not loaded
    let currentSuggestions = suggestions;
    if (currentSuggestions.length === 0) {
      const res = await fetch("/api/analytics/target-suggestions");
      const data = await res.json();
      currentSuggestions = data.suggestions ?? [];
      setSuggestions(currentSuggestions);
    }

    setSaving(true);
    try {
      await Promise.all(
        template.metrics.map(({ metric, period }) => {
          const suggestion = currentSuggestions.find((s) => s.metric === metric && s.period === period);
          const target = suggestion ? suggestion.achievable : null;
          if (!target || target <= 0) return Promise.resolve();
          return fetch("/api/kpi-targets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metric, period, platform: null, target }),
          });
        })
      );
      await loadProgress();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  // Custom target submit
  const handleAddCustom = async () => {
    setSaveError("");
    const targetNum = parseFloat(customTarget);
    if (!customTarget || isNaN(targetNum) || targetNum <= 0) {
      setSaveError("Enter a valid positive number");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/kpi-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: customMetric,
          period: customPeriod,
          platform: customPlatform || null,
          target: targetNum,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to save");
      } else {
        setCustomTarget("");
        setCustomOpen(false);
        await loadProgress();
      }
    } catch { setSaveError("Failed to save"); }
    finally { setSaving(false); }
  };

  // Summary stats
  const total = progress.length;
  const onTrack = progress.filter((p) => p.onTrack).length;
  const behind = progress.filter((p) => !p.onTrack && p.paceStatus !== "complete").length;
  const complete = progress.filter((p) => p.paceStatus === "complete").length;

  // Filtered suggestions for the suggest panel (only show periods that have data)
  const filteredSuggestions = suggestions.filter((s) => s.basedOnPeriods > 0 && s.currentAvg > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          Goals & Targets
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Set measurable targets, track progress in real time, and get smart suggestions based on your actual performance.
        </p>
      </div>

      {/* Summary row */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Active Targets", value: total, color: "text-zinc-900 dark:text-zinc-100" },
            { label: "On Track", value: onTrack, color: "text-blue-600 dark:text-blue-400" },
            { label: "Behind", value: behind, color: "text-red-500 dark:text-red-400" },
            { label: "Completed", value: complete, color: "text-emerald-600 dark:text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Current progress */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
        </div>
      ) : progress.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Current Period Progress</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {progress.map((item) => (
              <KpiTargetCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <Target className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No targets set yet</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Use Smart Suggest below to generate targets from your data, pick a template, or add a custom target.
          </p>
        </div>
      )}

      {/* ── Smart Suggest ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Smart Suggest
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadSuggestions}
              disabled={suggestLoading}
            >
              {suggestLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              )}
              {suggestLoading ? "Analysing…" : "Analyse my performance"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Analyses your last 3 complete periods and suggests achievable (+10%) and stretch (+25%) targets for each metric.
          </p>

          {suggestOpen && filteredSuggestions.length > 0 && (
            <div className="mt-4 space-y-4">
              {(["weekly", "monthly", "quarterly"] as const).map((period) => {
                const periodSuggestions = filteredSuggestions.filter((s) => s.period === period);
                if (periodSuggestions.length === 0) return null;
                return (
                  <div key={period}>
                    <p className="mb-2 text-xs font-semibold capitalize text-zinc-600 dark:text-zinc-400">{period}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="pb-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Metric</th>
                            <th className="pb-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Your avg</th>
                            <th className="pb-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Last period</th>
                            <th className="pb-2 text-center font-medium text-zinc-500 dark:text-zinc-400">
                              Achievable <span className="text-zinc-400">(+10%)</span>
                            </th>
                            <th className="pb-2 text-center font-medium text-zinc-500 dark:text-zinc-400">
                              Stretch <span className="text-zinc-400">(+25%)</span>
                            </th>
                            <th className="pb-2 text-center font-medium text-zinc-500 dark:text-zinc-400">Skip</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodSuggestions.map((s) => {
                            const key = `${s.metric}|${s.period}`;
                            const sel = suggestSelections[key] ?? null;
                            return (
                              <tr key={key} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                                <td className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                                  {METRIC_LABELS[s.metric] ?? s.metric}
                                </td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400">
                                  {formatValue(s.metric, s.currentAvg)}
                                </td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400">
                                  {formatValue(s.metric, s.lastPeriodValue)}
                                </td>
                                <td className="py-2 text-center">
                                  <button
                                    onClick={() => setSuggestSelections((prev) => ({ ...prev, [key]: sel === "achievable" ? null : "achievable" }))}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                      sel === "achievable"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-blue-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    }`}
                                  >
                                    {sel === "achievable" && <CheckCircle2 className="mr-0.5 inline h-3 w-3" />}
                                    {formatValue(s.metric, s.achievable)}
                                  </button>
                                </td>
                                <td className="py-2 text-center">
                                  <button
                                    onClick={() => setSuggestSelections((prev) => ({ ...prev, [key]: sel === "stretch" ? null : "stretch" }))}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                      sel === "stretch"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-purple-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    }`}
                                  >
                                    {sel === "stretch" && <CheckCircle2 className="mr-0.5 inline h-3 w-3" />}
                                    {formatValue(s.metric, s.stretch)}
                                  </button>
                                </td>
                                <td className="py-2 text-center">
                                  <button
                                    onClick={() => setSuggestSelections((prev) => {
                                      const next = { ...prev };
                                      delete next[key];
                                      return next;
                                    })}
                                    className="rounded p-1 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {Object.values(suggestSelections).filter(Boolean).length} target{Object.values(suggestSelections).filter(Boolean).length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSuggestOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplySuggestions}
                    disabled={applyingSuggestions || Object.values(suggestSelections).filter(Boolean).length === 0}
                  >
                    {applyingSuggestions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Apply selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {suggestOpen && filteredSuggestions.length === 0 && !suggestLoading && (
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              Not enough historical data to generate suggestions. Scrape more posts and try again.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Goal Templates ─────────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Goal Templates</h3>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          One-click bundles that apply achievable targets for a specific growth strategy. Targets are calculated from your actual data.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GOAL_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 flex flex-col"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${template.color}`} />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{template.name}</p>
                </div>
                <p className="mb-3 flex-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {template.description}
                </p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {template.metrics.map(({ metric, period }) => (
                    <Badge key={`${metric}|${period}`} variant="secondary" className="text-[10px]">
                      {METRIC_LABELS[metric] ?? metric} · {period}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={saving}
                  onClick={() => handleApplyTemplate(template)}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Apply template
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Custom Target ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setCustomOpen((v) => !v)}
          >
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Add Custom Target
            </CardTitle>
            {customOpen
              ? <ChevronUp className="h-4 w-4 text-zinc-400" />
              : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
        </CardHeader>

        {customOpen && (
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              {/* Metric */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Metric</label>
                <select
                  value={customMetric}
                  onChange={(e) => setCustomMetric(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {VALID_METRICS.map((m) => (
                    <option key={m} value={m}>{METRIC_LABELS[m] ?? m}</option>
                  ))}
                </select>
              </div>

              {/* Period */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Period</label>
                <select
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {VALID_PERIODS.map((p) => (
                    <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Platform</label>
                <select
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All Platforms</option>
                  {PLATFORMS.filter(Boolean).map((p) => (
                    <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform]?.label ?? p}</option>
                  ))}
                </select>
              </div>

              {/* Target value */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Target value
                  {customMetric === "engagementRate" && (
                    <span className="ml-1 text-zinc-400">(as decimal, e.g. 0.05 = 5%)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step={customMetric === "engagementRate" ? "0.001" : "1"}
                  placeholder={customMetric === "engagementRate" ? "e.g. 0.05" : "e.g. 10000"}
                  value={customTarget}
                  onChange={(e) => { setCustomTarget(e.target.value); setSaveError(""); }}
                  className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <Button onClick={handleAddCustom} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Target
              </Button>
            </div>

            {saveError && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" /> {saveError}
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
