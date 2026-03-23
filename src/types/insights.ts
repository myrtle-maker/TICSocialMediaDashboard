export type InsightCategory = "performance" | "content" | "timing" | "hooks" | "growth";
export type InsightPriority = "high" | "medium" | "low";
export type InsightType = "positive" | "negative" | "neutral" | "action";

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  type: InsightType;
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
  relatedPosts?: string[];
  dataPoints?: Record<string, number | string>;
}

export interface InsightsResponse {
  insights: Insight[];
  generatedAt: string;
  postCount: number;
  dateRange: { from: string; to: string } | null;
}
