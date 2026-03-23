"use client";

import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";

interface BaseChartProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  height?: number;
  className?: string;
  action?: React.ReactNode;
}

export function BaseChart({
  title,
  tooltip,
  children,
  height = 300,
  className,
  action,
}: BaseChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        {tooltip ? (
          <MetricTooltip label={title} tooltip={tooltip}>
            <span />
          </MetricTooltip>
        ) : (
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        )}
        {action}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
