import {
  Music,
  Camera,
  Play,
  AtSign,
  ThumbsUp,
  Briefcase,
} from "lucide-react";
import type { Platform } from "@/types/social";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconComponents: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  music: Music,
  camera: Camera,
  play: Play,
  "at-sign": AtSign,
  "thumbs-up": ThumbsUp,
  briefcase: Briefcase,
};

interface PlatformIconProps {
  platform: Platform;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function PlatformIcon({
  platform,
  size = "md",
  showLabel = false,
  className,
}: PlatformIconProps) {
  const config = PLATFORM_CONFIG[platform];
  const Icon = iconComponents[config.icon];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg",
          sizeClasses[size]
        )}
        style={{ backgroundColor: config.bgColor }}
      >
        {Icon && (
          <Icon
            className={iconSizeClasses[size]}
            style={{ color: config.color }}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-zinc-700">
          {config.label}
        </span>
      )}
    </div>
  );
}
