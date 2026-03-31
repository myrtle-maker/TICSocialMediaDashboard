"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  Send,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictResult {
  score: number;
  reasons: string[];
  suggestions: string[];
  confidence: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const BRIEFING_KEY = "tic-ai-briefing";
const BRIEFING_TS_KEY = "tic-ai-briefing-ts";
const BRIEFING_FOCUS_KEY = "tic-ai-briefing-focus";

function loadCachedBriefing(): { text: string; timestamp: number; focus: string | null } | null {
  if (typeof window === "undefined") return null;
  const text = localStorage.getItem(BRIEFING_KEY);
  const ts = localStorage.getItem(BRIEFING_TS_KEY);
  const focus = localStorage.getItem(BRIEFING_FOCUS_KEY);
  if (text && ts) return { text, timestamp: Number(ts), focus: focus || null };
  return null;
}

function saveBriefing(text: string, focus: string | null) {
  localStorage.setItem(BRIEFING_KEY, text);
  localStorage.setItem(BRIEFING_TS_KEY, String(Date.now()));
  if (focus) localStorage.setItem(BRIEFING_FOCUS_KEY, focus);
  else localStorage.removeItem(BRIEFING_FOCUS_KEY);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Content Predictor Section
// ---------------------------------------------------------------------------

function ContentPredictor() {
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("video");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score fill
  useEffect(() => {
    if (!result) {
      setAnimatedScore(0);
      return;
    }
    setAnimatedScore(0);
    const target = result.score;
    const duration = 800;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [result]);

  async function handlePredict() {
    if (!caption.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, platform, contentType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to predict. Try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function scoreColor(score: number): string {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  }

  function scoreTextColor(score: number): string {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }

  const confidenceVariant = {
    high: "success" as const,
    medium: "warning" as const,
    low: "destructive" as const,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-blue-500" />
          Content Performance Predictor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Caption input */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Paste your caption or hook to predict performance..."
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />

        {/* Controls row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Platform
            </label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="twitter">X / Twitter</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Content Type
            </label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handlePredict}
            disabled={loading || !caption.trim()}
            className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Predict Performance
          </button>
        </div>

        {/* Result area */}
        {loading && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              <button
                onClick={handlePredict}
                className="mt-1 text-xs font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-5 dark:border-zinc-700 dark:bg-zinc-800/50">
            {/* Score */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-200 dark:text-zinc-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(animatedScore / 100) * 213.6} 213.6`}
                    className={scoreColor(result.score).replace("bg-", "text-")}
                    stroke="currentColor"
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreTextColor(result.score)}`}
                >
                  {animatedScore}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Performance Score
                </p>
                <Badge variant={confidenceVariant[result.confidence]}>
                  {result.confidence} confidence
                </Badge>
              </div>
            </div>

            {/* Reasons */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Why this score
              </p>
              <ul className="space-y-1">
                {result.reasons.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Suggestions to improve
              </p>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-10 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
            <Sparkles className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Type a caption above to predict performance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Briefing Renderer (simple markdown-like)
// ---------------------------------------------------------------------------

function renderBriefingText(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="mt-5 mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
        >
          {line.slice(4)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mt-6 mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100"
        >
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      elements.push(
        <li
          key={i}
          className="ml-4 list-disc text-sm text-zinc-700 leading-relaxed dark:text-zinc-300"
        >
          {renderInline(line.slice(2))}
        </li>
      );
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      elements.push(
        <li
          key={i}
          className="ml-4 list-decimal text-sm text-zinc-700 leading-relaxed dark:text-zinc-300"
        >
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-zinc-700 leading-relaxed dark:text-zinc-300">
        {renderInline(line)}
      </p>
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Focus options
// ---------------------------------------------------------------------------

const FOCUS_OPTIONS = [
  { value: "none", label: "General strategy (no specific focus)" },
  { value: "Grow follower count across all platforms", label: "Grow followers" },
  { value: "Maximise engagement rate on every post", label: "Boost engagement" },
  { value: "Increase video views and reach", label: "Increase views & reach" },
  { value: "Improve Instagram performance", label: "Instagram growth" },
  { value: "Improve TikTok performance", label: "TikTok growth" },
  { value: "Improve YouTube performance including Shorts", label: "YouTube growth" },
  { value: "Improve LinkedIn performance", label: "LinkedIn growth" },
  { value: "Build a stronger content calendar with consistent posting", label: "Posting consistency" },
  { value: "Identify and double down on our best-performing content types", label: "Double down on winners" },
];

// ---------------------------------------------------------------------------
// AI Strategy Briefing Section
// ---------------------------------------------------------------------------

function StrategyBriefing() {
  const [briefing, setBriefing] = useState<string>("");
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [cachedFocus, setCachedFocus] = useState<string | null>(null);
  const [focus, setFocus] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Load cached briefing on mount
  useEffect(() => {
    const cached = loadCachedBriefing();
    if (cached) {
      setBriefing(cached.text);
      setTimestamp(cached.timestamp);
      setCachedFocus(cached.focus);
    }
  }, []);

  const generateBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBriefing("");

    const activeFocus = focus && focus !== "none" ? focus : null;

    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: activeFocus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error ||
            "Unable to generate briefing. Check your Anthropic API key in Settings."
        );
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read stream.");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setBriefing(accumulated);
        if (textRef.current) {
          textRef.current.scrollTop = textRef.current.scrollHeight;
        }
      }

      saveBriefing(accumulated, activeFocus);
      setTimestamp(Date.now());
      setCachedFocus(activeFocus);
    } catch {
      setError(
        "Unable to generate briefing. Check your Anthropic API key in Settings."
      );
    } finally {
      setLoading(false);
    }
  }, [focus]);

  const focusLabel = cachedFocus
    ? FOCUS_OPTIONS.find((o) => o.value === cachedFocus)?.label ?? cachedFocus
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            This Week&apos;s Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {timestamp && !loading && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Last generated: {timeAgo(timestamp)}
              </span>
            )}
            {briefing && !loading && (
              <button
                onClick={generateBriefing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Focus selector */}
        {!briefing && !loading && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Target className="h-3.5 w-3.5" />
              Briefing focus (optional)
            </label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="General strategy (no specific focus)" />
              </SelectTrigger>
              <SelectContent>
                {FOCUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!briefing && !loading && !error && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
            <Sparkles className="mb-4 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Get an AI-powered strategy briefing based on your content
              performance data.
            </p>
            <button
              onClick={generateBriefing}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate Briefing
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !briefing && (
          <div className="flex items-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Analyzing your data and writing the briefing...
            </p>
          </div>
        )}

        {/* Briefing content */}
        {briefing && (
          <div className="space-y-3">
            {/* Focus chip */}
            {focusLabel && !loading && (
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Focused on:{" "}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {focusLabel}
                  </span>
                </span>
              </div>
            )}
            <div
              ref={textRef}
              className="max-h-[700px] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/30"
            >
              {renderBriefingText(briefing)}
              {loading && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-zinc-400 dark:bg-zinc-500" />
              )}
            </div>
            {/* Regenerate with new focus — shown below the briefing */}
            {!loading && (
              <div className="flex flex-wrap items-end gap-3 pt-1">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Target className="h-3.5 w-3.5" />
                    Change focus and regenerate
                  </label>
                  <Select value={focus} onValueChange={setFocus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="General strategy (no specific focus)" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOCUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={generateBriefing}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AIBriefingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          AI Briefing
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Predict content performance and get AI-powered strategy recommendations.
        </p>
      </div>

      <ContentPredictor />
      <StrategyBriefing />
    </div>
  );
}
