"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insight, InsightCategory } from "@/types/insights";

interface InsightCategoryTabsProps {
  insights: Insight[];
  onCategoryChange: (cat: string) => void;
  selectedCategory: string;
}

const categories: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "performance", label: "Performance" },
  { value: "content", label: "Content" },
  { value: "timing", label: "Timing" },
  { value: "hooks", label: "Hooks" },
  { value: "growth", label: "Growth" },
];

export function InsightCategoryTabs({
  insights,
  onCategoryChange,
  selectedCategory,
}: InsightCategoryTabsProps) {
  function getCount(category: string): number {
    if (category === "all") return insights.length;
    return insights.filter((i) => i.category === category).length;
  }

  return (
    <Tabs
      value={selectedCategory}
      onValueChange={onCategoryChange}
    >
      <TabsList className="flex flex-wrap h-auto gap-1">
        {categories.map((cat) => {
          const count = getCount(cat.value);
          return (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="gap-1.5"
            >
              {cat.label}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1 h-5 min-w-[20px] px-1.5 text-[10px]",
                  selectedCategory === cat.value &&
                    "bg-zinc-200 dark:bg-zinc-700"
                )}
              >
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
