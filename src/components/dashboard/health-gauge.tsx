"use client";

import { useEffect, useId, useState } from "react";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import type { Platform } from "@/types/social";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthGaugeProps {
  platform: string;
  score: number | null;
  trend: "up" | "down" | "stable";
  size?: number;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#a1a1aa"; // zinc-400
  if (score >= 70) return "#22c55e"; // green-500
  if (score >= 40) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

function scoreColorDark(score: number | null): string {
  if (score === null) return "#71717a"; // zinc-500
  if (score >= 70) return "#4ade80"; // green-400
  if (score >= 40) return "#facc15"; // yellow-400
  return "#f87171"; // red-400
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  const cls = "h-3.5 w-3.5";
  if (trend === "up")
    return <TrendingUp className={`${cls} text-green-500 dark:text-green-400`} />;
  if (trend === "down")
    return <TrendingDown className={`${cls} text-red-500 dark:text-red-400`} />;
  return <Minus className={`${cls} text-zinc-400 dark:text-zinc-500`} />;
};

export function HealthGauge({
  platform,
  score,
  trend,
  size = 96,
}: HealthGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const gaugeId = useId();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score ?? 0);
    }, 50);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillFraction = score !== null ? animatedScore / 100 : 0;
  const dashOffset = circumference * (1 - fillFraction);

  const isPlatformKnown = platform in PLATFORM_CONFIG;
  const lightColor = scoreColor(score);
  const darkColor = scoreColorDark(score);
  const cssVar = `--gauge-${gaugeId.replace(/:/g, "")}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <style>{`
        :root { ${cssVar}: ${lightColor}; }
        .dark { ${cssVar}: ${darkColor}; }
      `}</style>

      {/* SVG Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          {/* Foreground arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.8s ease-out",
              stroke: `var(${cssVar})`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{
              fontSize: size * 0.28,
              color: `var(${cssVar})`,
            }}
          >
            {score !== null ? score : "?"}
          </span>
          <div className="mt-0.5">
            <TrendIcon trend={score !== null ? trend : "stable"} />
          </div>
        </div>
      </div>

      {/* Platform label */}
      <div className="flex items-center gap-1">
        {isPlatformKnown && (
          <PlatformIcon platform={platform as Platform} size="sm" />
        )}
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize">
          {isPlatformKnown
            ? PLATFORM_CONFIG[platform as Platform].label
            : platform}
        </span>
      </div>
    </div>
  );
}
