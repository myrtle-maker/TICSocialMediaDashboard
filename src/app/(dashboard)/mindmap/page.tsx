"use client";

import { useEffect, useState, useCallback } from "react";
import { MindmapCanvas } from "@/components/mindmap/mindmap-canvas";
import { Loader2, Network, Info } from "lucide-react";

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
    relatedPosts: {
      id: string;
      platformPostId: string;
      platform: string;
      caption: string;
      engagementRate: number;
      views: number;
      thumbnailUrl: string | null;
    }[];
  }[];
  relatedPosts: {
    id: string;
    platformPostId: string;
    platform: string;
    caption: string;
    engagementRate: number;
    views: number;
    thumbnailUrl: string | null;
  }[];
}

export default function MindmapPage() {
  const [pillars, setPillars] = useState<PillarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex h-full flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Network className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            Idea Mindmap
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Organise post ideas by content pillar. Linked nodes show related existing posts.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {pillars.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50">
          <Network className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">No content pillars yet</h3>
          <p className="mb-4 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
            Create your first content pillar to start organising post ideas and discovering related content.
          </p>
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Info className="h-3.5 w-3.5" />
            Click &ldquo;Add Pillar&rdquo; in the canvas to get started
          </div>
          {/* Render empty canvas so the Add Pillar button is available */}
          <div className="mt-6 w-full flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden" style={{ height: 400 }}>
            <MindmapCanvas pillars={[]} onRefresh={fetchData} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <MindmapCanvas pillars={pillars} onRefresh={fetchData} />
        </div>
      )}
    </div>
  );
}
