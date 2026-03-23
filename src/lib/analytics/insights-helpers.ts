export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = avg(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function trendSlope(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function pctDiff(a: number, b: number): number {
  if (b === 0) return a > 0 ? 100 : 0;
  return ((a - b) / b) * 100;
}

export function groupBy<T>(
  items: T[],
  key: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

export function topN<T>(items: T[], n: number, score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function bottomN<T>(items: T[], n: number, score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(a) - score(b)).slice(0, n);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(1)}x`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(day: number): string {
  return DAY_NAMES[day] ?? "Unknown";
}

export function hourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export function timeBlockLabel(hour: number): string {
  const start = Math.floor(hour / 3) * 3;
  return `${hourLabel(start)}-${hourLabel(start + 3)}`;
}
