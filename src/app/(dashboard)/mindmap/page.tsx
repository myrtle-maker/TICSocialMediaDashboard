"use client";

import { useEffect, useState, useCallback } from "react";
import { MindmapCanvas } from "@/components/mindmap/mindmap-canvas";
import { Loader2, Network, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RelatedPost {
  id: string;
  platformPostId: string;
  platform: string;
  caption: string;
  engagementRate: number;
  views: number;
  thumbnailUrl: string | null;
}

interface PillarData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  ideas: {
    id: string;
    pillarId: string;
    title: string;
    notes: string;
    platform: string | null;
    contentType: string | null;
    hookType: string | null;
    targetHashtags: string[];
    keywords: string[];
    status: string;
    scheduledPostId: string | null;
    relatedPosts: RelatedPost[];
  }[];
  relatedPosts: RelatedPost[];
}

export default function MindmapPage() {
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mindmap");
      if (!res.ok) throw new Error("Failed to load mindmap data");
      const data = await res.json();
      setPillars(data.pillars ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSeedFromPosts() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/mindmap/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult(`Error: ${data.error ?? "Seed failed"}`);
      } else {
        setSeedResult(data.message);
        await fetchData();
      }
    } catch {
      setSeedResult("Failed to seed mindmap");
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedResult(null), 6000);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-1 pb-3">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Network className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            Idea Mindmap
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Content pillars and post ideas. Leaf nodes are related existing posts.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedFromPosts}
            disabled={seeding}
            className="shrink-0"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            )}
            {seeding ? "Analysing posts…" : "Populate from existing posts"}
          </Button>
          {seedResult && (
            <p className={`flex items-center gap-1 text-xs ${seedResult.startsWith("Error") ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
              {seedResult.startsWith("Error") && <AlertTriangle className="h-3 w-3" />}
              {seedResult}
            </p>
          )}
        </div>
      </div>

      {/* Canvas — always rendered so Add Pillar is always accessible */}
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        {pillars.length === 0 ? (
          <div className="relative h-full w-full">
            {/* Overlay hint */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white/90 px-6 py-5 text-center shadow-sm dark:border-zinc-600 dark:bg-zinc-900/90">
                <Network className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No content pillars yet</p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  Click <strong>&ldquo;Populate from existing posts&rdquo;</strong> above to auto-generate pillars from your scraped content,
                  or use <strong>&ldquo;Add Pillar&rdquo;</strong> in the canvas to start manually.
                </p>
              </div>
            </div>
            <MindmapCanvas pillars={[]} onRefresh={fetchData} />
          </div>
        ) : (
          <MindmapCanvas pillars={pillars} onRefresh={fetchData} />
        )}
      </div>
    </div>
  );
}
