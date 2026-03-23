"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { PLATFORM_CONFIG, PLATFORMS } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { BaseChart } from "@/components/charts/base-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPercentage, formatRelativeTime } from "@/lib/utils";
import {
  Swords,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Brain,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell,
} from "recharts";
import type { Platform } from "@/types/social";

interface Competitor {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
  followers: number;
  lastScrapedAt: string | null;
  createdAt: string;
  postCount: number;
}

interface CompetitorPost {
  id: string;
  platformPostId: string;
  platform: string;
  competitorId: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  hookText: string;
  hookType: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  engagementRate: number;
  publishedAt: string;
}

interface CompareData {
  you: {
    id: string;
    name: string;
    postCount: number;
    avgEngagementRate: number;
    bestHookType: string | null;
    bestContentType: string | null;
  };
  competitors: {
    id: string;
    name: string;
    platform: string;
    postCount: number;
    avgEngagementRate: number;
    bestHookType: string | null;
    bestContentType: string | null;
  }[];
  timeSeries: {
    you: { week: string; label: string; avgEngagementRate: number }[];
    competitors: Record<string, { week: string; label: string; avgEngagementRate: number }[]>;
  };
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function CompetitorsPage() {
  const { refreshKey, triggerRefresh } = useFilters();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Add form state
  const [newPlatform, setNewPlatform] = useState<string>("instagram");
  const [newHandle, setNewHandle] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [adding, setAdding] = useState(false);

  // AI analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadCompetitors = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      setCompetitors(data.competitors ?? []);
    } catch {
      setCompetitors([]);
    }
  }, []);

  const loadCompareData = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors/compare");
      const data = await res.json();
      if (!data.error) setCompareData(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadCompetitors(), loadCompareData()]);
      setLoading(false);
    }
    init();
  }, [loadCompetitors, loadCompareData, refreshKey]);

  const handleAdd = async () => {
    if (!newHandle.trim() || !newDisplayName.trim()) {
      setAddError("Handle and display name are required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: newPlatform, handle: newHandle, displayName: newDisplayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add competitor");
      } else {
        setNewHandle("");
        setNewDisplayName("");
        setShowAddForm(false);
        await loadCompetitors();
      }
    } catch {
      setAddError("Network error. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      await Promise.all([loadCompetitors(), loadCompareData()]);
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch("/api/competitors/scrape", { method: "POST" });
      // Start polling for collection
      setTimeout(() => pollCollect(), 10000);
    } catch {
      setScraping(false);
    }
  };

  const pollCollect = async () => {
    setCollecting(true);
    let attempts = 0;
    const maxAttempts = 12; // 2 minutes max

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch("/api/competitors/collect", { method: "POST" });
        const data = await res.json();

        const stillRunning = data.results?.some((r: { status: string }) => r.status === "still_running");

        if (stillRunning && attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setScraping(false);
          setCollecting(false);
          await Promise.all([loadCompetitors(), loadCompareData()]);
          triggerRefresh();
        }
      } catch {
        setScraping(false);
        setCollecting(false);
      }
    };

    await poll();
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ai/competitor-analysis", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setAiError(data.error || "Failed to generate analysis");
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiAnalysis(text);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate analysis");
    } finally {
      setAiLoading(false);
    }
  };

  // Build comparison chart data
  const comparisonBarData = useMemo(() => {
    if (!compareData) return [];
    const entries = [
      { name: "You", avgER: parseFloat(compareData.you.avgEngagementRate.toFixed(2)), posts: compareData.you.postCount },
      ...compareData.competitors.map((c) => ({
        name: c.name,
        avgER: parseFloat(c.avgEngagementRate.toFixed(2)),
        posts: c.postCount,
      })),
    ];
    return entries;
  }, [compareData]);

  // Build time series data for line chart
  const timeSeriesData = useMemo(() => {
    if (!compareData) return [];
    const allWeeks = new Set<string>();
    compareData.timeSeries.you.forEach((w) => allWeeks.add(w.week));
    Object.values(compareData.timeSeries.competitors).forEach((series) =>
      series.forEach((w) => allWeeks.add(w.week))
    );

    const sortedWeeks = [...allWeeks].sort();
    return sortedWeeks.map((week) => {
      const point: Record<string, unknown> = {
        week,
        label: `W/O ${week.slice(5)}`,
      };
      const youPoint = compareData.timeSeries.you.find((w) => w.week === week);
      point["You"] = youPoint ? parseFloat(youPoint.avgEngagementRate.toFixed(2)) : null;

      for (const c of compareData.competitors) {
        const cSeries = compareData.timeSeries.competitors[c.id];
        const cPoint = cSeries?.find((w) => w.week === week);
        point[c.name] = cPoint ? parseFloat(cPoint.avgEngagementRate.toFixed(2)) : null;
      }
      return point;
    });
  }, [compareData]);

  const lineNames = useMemo(() => {
    if (!compareData) return [];
    return ["You", ...compareData.competitors.map((c) => c.name)];
  }, [compareData]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Competitors</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Benchmark your performance against competitors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {competitors.length > 0 && (
            <Button
              variant="outline"
              onClick={handleScrape}
              disabled={scraping || collecting}
            >
              {scraping || collecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{scraping ? "Scraping..." : collecting ? "Collecting..." : "Scrape All"}</span>
            </Button>
          )}
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            <span>Add Competitor</span>
          </Button>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddForm && (
        <Card className="border-2 border-zinc-300 dark:border-zinc-600">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Competitor</h3>
              <button
                onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Platform</label>
                <Select value={newPlatform} onValueChange={setNewPlatform}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Handle / URL</label>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="e.g. @competitor or URL"
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-700 dark:placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Competitor Brand"
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-700 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>
            {addError && (
              <p className="mt-2 text-xs text-red-500">{addError}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setAddError(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Add</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Charts */}
      {compareData && (compareData.you.postCount > 0 || compareData.competitors.some((c) => c.postCount > 0)) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Avg ER Comparison Bar Chart */}
          <BaseChart
            title="Avg Engagement Rate Comparison"
            tooltip="Average engagement rate across all posts for each entity."
            height={300}
          >
            <BarChart data={comparisonBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                formatter={(value) => [`${value}%`, "Avg ER"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Bar dataKey="avgER" name="Avg ER" radius={[4, 4, 0, 0]}>
                {comparisonBarData.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </BaseChart>

          {/* Weekly ER Trend Line Chart */}
          {timeSeriesData.length > 0 && (
            <BaseChart
              title="Weekly Engagement Rate Trend"
              tooltip="Average weekly engagement rate over the last 8 weeks."
              height={300}
            >
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(value) => [value != null ? `${value}%` : "N/A", ""]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {lineNames.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={name === "You" ? 3 : 2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </BaseChart>
          )}
        </div>
      )}

      {/* Metrics Comparison Cards */}
      {compareData && compareData.competitors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Your card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your Accounts</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {compareData.you.postCount} posts
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Avg ER</p>
                  <p className="text-sm font-bold">{formatPercentage(compareData.you.avgEngagementRate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Best Hook</p>
                  <p className="text-sm font-bold capitalize">{compareData.you.bestHookType ?? "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitor cards */}
          {compareData.competitors.map((c, idx) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[(idx + 1) % CHART_COLORS.length] }}
                  />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {c.postCount} posts
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Avg ER</p>
                    <p className="text-sm font-bold">{formatPercentage(c.avgEngagementRate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Best Hook</p>
                    <p className="text-sm font-bold capitalize">{c.bestHookType ?? "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Gap Analysis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-purple-500" />
            AI Gap Analysis
          </CardTitle>
          {!aiAnalysis && !aiLoading && (
            <Button variant="outline" size="sm" onClick={handleAiAnalysis} disabled={competitors.length === 0}>
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Generate Analysis</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {aiLoading && !aiAnalysis && (
            <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing competitor data...
            </div>
          )}
          {aiError && (
            <p className="text-sm text-red-500">{aiError}</p>
          )}
          {aiAnalysis && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(aiAnalysis) }} />
            </div>
          )}
          {!aiAnalysis && !aiLoading && !aiError && competitors.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Add competitors and scrape their data to generate an AI gap analysis.
            </p>
          )}
          {!aiAnalysis && !aiLoading && !aiError && competitors.length > 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Click &quot;Generate Analysis&quot; to get AI-powered competitive insights.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Competitor Cards Grid */}
      {competitors.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tracked Competitors</h3>
          <div className="space-y-3">
            {competitors.map((competitor) => {
              const config = PLATFORM_CONFIG[competitor.platform as Platform];
              return (
                <Card key={competitor.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <PlatformIcon platform={competitor.platform as Platform} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          @{competitor.handle}
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {config?.label ?? competitor.platform}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {competitor.postCount} posts
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {competitor.displayName}
                        {competitor.lastScrapedAt
                          ? ` \u00b7 Last scraped: ${formatRelativeTime(competitor.lastScrapedAt)}`
                          : " \u00b7 Not yet scraped"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                        onClick={() => handleRemove(competitor.id)}
                        disabled={removing === competitor.id}
                        title="Remove competitor"
                      >
                        {removing === competitor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {competitors.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
          <Swords className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No competitors yet
          </h3>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Add competitors to benchmark your social media performance.
          </p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            <span>Add Competitor</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/** Simple markdown-to-HTML converter for AI analysis output */
function markdownToHtml(md: string): string {
  return md
    .replace(/### (.+)/g, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
