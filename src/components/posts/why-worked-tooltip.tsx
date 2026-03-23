"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HOOK_TYPE_LABELS, PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { Sparkles } from "lucide-react";
import type { Platform, HookType, ContentType } from "@/types/social";

interface WhyWorkedTooltipProps {
  postId: string;
  engagementRate: number;
  hookType: string;
  contentType: string;
  platform: string;
  avgER: number;
  saves?: number;
  shares?: number;
  views?: number;
}

function generateExplanation({
  engagementRate,
  hookType,
  contentType,
  platform,
  avgER,
  saves = 0,
  shares = 0,
  views = 0,
}: Omit<WhyWorkedTooltipProps, "postId">): string[] {
  const lines: string[] = [];

  // Compare ER to average
  const multiplier = avgER > 0 ? engagementRate / avgER : 0;
  if (multiplier > 1) {
    lines.push(
      `This post performed ${multiplier.toFixed(1)}x above your average engagement rate.`
    );
  }

  // Hook type insight
  const hookLabel = HOOK_TYPE_LABELS[hookType as HookType] ?? hookType;
  lines.push(
    `The "${hookLabel}" hook style tends to capture attention effectively.`
  );

  // Content type + platform insight
  const contentLabel = CONTENT_TYPE_LABELS[contentType as ContentType] ?? contentType;
  const platformLabel = PLATFORM_CONFIG[platform as Platform]?.label ?? platform;
  lines.push(
    `${contentLabel} content drives strong engagement on ${platformLabel}.`
  );

  // High saves insight
  if (views > 0 && saves > 0) {
    const saveRate = saves / views;
    if (saveRate > 0.02) {
      lines.push(
        "High save rate suggests valuable, reference-worthy content."
      );
    }
  }

  // High shares insight
  if (views > 0 && shares > 0) {
    const shareRate = shares / views;
    if (shareRate > 0.01) {
      lines.push(
        "High share rate indicates virally shareable content."
      );
    }
  }

  return lines;
}

export function WhyWorkedTooltip({
  postId,
  engagementRate,
  hookType,
  contentType,
  platform,
  avgER,
  saves,
  shares,
  views,
}: WhyWorkedTooltipProps) {
  // Only show for posts performing above 1.5x average
  if (avgER <= 0 || engagementRate < avgER * 1.5) {
    return null;
  }

  const explanations = generateExplanation({
    engagementRate,
    hookType,
    contentType,
    platform,
    avgER,
    saves,
    shares,
    views,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-0.5 text-amber-500 transition-colors hover:text-amber-400"
            aria-label="Why this worked"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] space-y-1.5 px-3 py-2.5"
        >
          <p className="text-[11px] font-semibold text-amber-400">
            Why This Worked
          </p>
          {explanations.map((line, i) => (
            <p key={`${postId}-tip-${i}`} className="text-[11px] leading-relaxed">
              {line}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
