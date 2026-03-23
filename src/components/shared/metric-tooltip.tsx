"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricTooltipProps {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}

export function MetricTooltip({ label, tooltip, children }: MetricTooltipProps) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 cursor-help text-zinc-400" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  );
}
