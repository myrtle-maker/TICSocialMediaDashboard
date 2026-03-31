"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { formatNumber, formatPercentage, cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  tooltip: string;
  value: number;
  format?: "number" | "percentage";
  trend?: { value: number; label: string };
  icon?: React.ReactNode;
}

export function KpiCard({
  label,
  tooltip,
  value,
  format = "number",
  trend,
  icon,
}: KpiCardProps) {
  const formattedValue =
    format === "percentage" ? formatPercentage(value) : formatNumber(value);

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-5">
        <MetricTooltip label={label} tooltip={tooltip}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formattedValue}
              </p>
              {trend && (
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1 text-xs font-medium",
                    trend.value > 0
                      ? "text-emerald-600"
                      : trend.value < 0
                        ? "text-red-600"
                        : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {trend.value > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trend.value < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>
                    {trend.value > 0 ? "+" : ""}
                    {formatPercentage(trend.value, 1)} {trend.label}
                  </span>
                </div>
              )}
            </div>
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                {icon}
              </div>
            )}
          </div>
        </MetricTooltip>
      </CardContent>
    </Card>
  );
}
