"use client";

import { useEffect, useState, useCallback } from "react";
import { HealthGauge } from "@/components/dashboard/health-gauge";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";

interface PlatformScore {
  platform: string;
  score: number | null;
  trend: "up" | "down" | "stable";
  postCount: number;
  avgER: number;
  status?: string;
}

interface HealthScoreRowProps {
  refreshKey: number;
}

export function HealthScoreRow({ refreshKey }: HealthScoreRowProps) {
  const [scores, setScores] = useState<PlatformScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/health");
      const data = await res.json();
      setScores(data.scores ?? []);
    } catch (err) {
      console.error("Failed to fetch health scores:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No health scores yet"
        description="Add accounts to see health scores for each platform."
      />
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Platform Health
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {scores.map((s) => (
          <div
            key={s.platform}
            className="flex justify-center rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <HealthGauge
              platform={s.platform}
              score={s.score}
              trend={s.trend}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
