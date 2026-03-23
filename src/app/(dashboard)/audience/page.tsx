"use client";

import { useMemo } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { getPostingHeatmap } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercentage } from "@/lib/utils";
import { AlertTriangle, Globe, Clock, Star } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
);

// Simulated language/country data
const SIMULATED_LANGUAGES = [
  { language: "English", percentage: 62 },
  { language: "Spanish", percentage: 14 },
  { language: "Portuguese", percentage: 8 },
  { language: "French", percentage: 6 },
  { language: "German", percentage: 4 },
  { language: "Other", percentage: 6 },
];

const SIMULATED_COUNTRIES = [
  { country: "United States", code: "US", percentage: 38 },
  { country: "United Kingdom", code: "GB", percentage: 12 },
  { country: "Canada", code: "CA", percentage: 9 },
  { country: "Australia", code: "AU", percentage: 7 },
  { country: "Brazil", code: "BR", percentage: 6 },
  { country: "India", code: "IN", percentage: 5 },
  { country: "Germany", code: "DE", percentage: 4 },
  { country: "France", code: "FR", percentage: 3 },
  { country: "Mexico", code: "MX", percentage: 3 },
  { country: "Other", code: "--", percentage: 13 },
];

export default function AudiencePage() {
  const { filters } = useFilters();

  const heatmapData = useMemo(() => getPostingHeatmap(filters), [filters]);

  // Build 7x24 grid
  const heatmapGrid = useMemo(() => {
    const maxRate = Math.max(
      ...heatmapData.map((h) => h.avgEngagementRate),
      1
    );
    const grid: {
      day: number;
      hour: number;
      rate: number;
      count: number;
      intensity: number;
    }[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: typeof grid[0] = [];
      for (let h = 0; h < 24; h++) {
        const cell = heatmapData.find((c) => c.day === d && c.hour === h);
        const rate = cell?.avgEngagementRate ?? 0;
        row.push({
          day: d,
          hour: h,
          rate,
          count: cell?.postCount ?? 0,
          intensity: maxRate > 0 ? rate / maxRate : 0,
        });
      }
      grid.push(row);
    }
    return grid;
  }, [heatmapData]);

  // Compute best posting times from heatmap
  const bestTimes = useMemo(() => {
    const flat = heatmapData
      .filter((h) => h.postCount > 0)
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
      .slice(0, 5);
    return flat.map((t) => ({
      day: DAY_LABELS[t.day],
      hour: `${t.hour}:00`,
      rate: t.avgEngagementRate,
      count: t.postCount,
    }));
  }, [heatmapData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Audience Insights
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Understand when and where your audience is most active.
        </p>
      </div>

      {/* Disclaimer Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Estimated Data Disclaimer
          </p>
          <p className="text-xs text-amber-700">
            Demographics and audience data shown here are estimated from
            publicly available engagement patterns. Language and country
            breakdowns are simulated and should be treated as directional
            guidance only. Connect platform analytics APIs for accurate
            demographic data.
          </p>
        </div>
      </div>

      {/* Active Times Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Active Times Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Engagement rate by day and hour (UTC). Darker cells = higher
            engagement.
          </p>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Hour labels */}
              <div className="flex">
                <div className="w-12 shrink-0" />
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="flex w-7 items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500"
                  >
                    {HOUR_LABELS[h]}
                  </div>
                ))}
              </div>
              {/* Grid rows */}
              {heatmapGrid.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center">
                  <div className="w-12 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {DAY_LABELS[dayIdx]}
                  </div>
                  {row.map((cell) => (
                    <div
                      key={`${cell.day}-${cell.hour}`}
                      className="m-0.5 h-6 w-6 rounded-sm transition-colors"
                      style={{
                        backgroundColor:
                          cell.count === 0
                            ? "#f4f4f5"
                            : `rgba(16, 185, 129, ${
                                0.1 + cell.intensity * 0.9
                              })`,
                      }}
                      title={`${DAY_LABELS[cell.day]} ${cell.hour}:00 - Rate: ${cell.rate.toFixed(2)}%, Posts: ${cell.count}`}
                    />
                  ))}
                </div>
              ))}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span>Low</span>
                <div className="flex">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                    <div
                      key={intensity}
                      className="h-3 w-5 rounded-sm"
                      style={{
                        backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                      }}
                    />
                  ))}
                </div>
                <span>High</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Language Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Language Breakdown
              <Badge variant="warning" className="ml-2 text-[10px]">
                Estimated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {SIMULATED_LANGUAGES.map((lang) => (
                <div key={lang.language}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{lang.language}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {lang.percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Country Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Country Breakdown
              <Badge variant="warning" className="ml-2 text-[10px]">
                Estimated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SIMULATED_COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                      {country.code}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${country.percentage * 2.5}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {country.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Posting Times Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4 text-amber-500" />
            Best Posting Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Based on historical engagement data, these are your top-performing
            posting windows (UTC).
          </p>
          {bestTimes.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Not enough data to determine best posting times.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {bestTimes.map((t, idx) => (
                <div
                  key={`${t.day}-${t.hour}`}
                  className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700"
                >
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <span className="text-xs font-bold text-amber-600">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.day} at {t.hour}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatPercentage(t.rate)} avg rate
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {t.count} post{t.count !== 1 ? "s" : ""} analyzed
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
