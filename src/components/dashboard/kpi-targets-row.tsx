"use client";

import { useEffect, useState } from "react";
import type { KpiProgressItem } from "@/app/api/analytics/kpi-progress/route";
import { KpiTargetCard } from "./kpi-target-card";
import { Target, ChevronRight } from "lucide-react";
import Link from "next/link";

interface KpiTargetsRowProps {
  refreshKey?: number;
}

export function KpiTargetsRow({ refreshKey }: KpiTargetsRowProps) {
  const [items, setItems] = useState<KpiProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/kpi-progress")
      .then((r) => r.json())
      .then((data) => setItems(data.progress ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading || items.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">KPI Targets</h3>
        </div>
        <Link
          href="/goals"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Manage
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <KpiTargetCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
