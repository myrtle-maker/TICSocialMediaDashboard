"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { InsightCard } from "@/components/insights/insight-card";
import { InsightsSummary } from "@/components/insights/insights-summary";
import { InsightCategoryTabs } from "@/components/insights/insight-category-tabs";
import { ActionPlan } from "@/components/insights/action-plan";
import { Loader2, Lightbulb } from "lucide-react";
import type { Insight, InsightsResponse, InsightCategory } from "@/types/insights";

function buildFilterParams(filters: ReturnType<typeof useFilters>["filters"]): string {
  const params = new URLSearchParams();
  if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","));
  if (filters.contentTypes.length > 0) params.set("contentTypes", filters.contentTypes.join(","));
  if (filters.hookTypes.length > 0) params.set("hookTypes", filters.hookTypes.join(","));
  if (filters.dateRange) {
    params.set("from", filters.dateRange.from.toISOString());
    params.set("to", filters.dateRange.to.toISOString());
  }
  if (filters.searchQuery) params.set("q", filters.searchQuery);
  return params.toString();
}

export default function InsightsPage() {
  const { filters } = useFilters();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(filters);
      const res = await fetch(`/api/analytics/insights?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const filteredInsights = useMemo(() => {
    if (!data) return [];
    if (selectedCategory === "all") return data.insights;
    return data.insights.filter((i) => i.category === selectedCategory);
  }, [data, selectedCategory]);

  const actionInsights = useMemo(
    () => data?.insights.filter((i) => i.type === "action") ?? [],
    [data]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data || data.insights.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights & Strategy</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Algorithmic analysis of your content performance.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
          <Lightbulb className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Not enough data for insights
          </h3>
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Add more accounts and run a scrape to collect posts. Insights are generated
            from at least 5 posts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights & Strategy</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Algorithmic analysis of {data.postCount} posts to help you 10x your social media performance.
        </p>
      </div>

      {/* Summary KPIs */}
      <InsightsSummary insights={data.insights} postCount={data.postCount} />

      {/* Action Plan */}
      {actionInsights.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Action Plan
          </h3>
          <ActionPlan insights={actionInsights} />
        </div>
      )}

      {/* Category Tabs + Insights Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            All Insights
          </h3>
          <InsightCategoryTabs
            insights={data.insights}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>

        {filteredInsights.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No insights in this category.
          </p>
        )}
      </div>
    </div>
  );
}
