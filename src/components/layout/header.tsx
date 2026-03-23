"use client";

import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { useState } from "react";

interface HeaderProps {
  title: string;
  description?: string;
  lastUpdated?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title,
  description,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-zinc-400">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="ml-1">Refresh</span>
          </Button>
        )}
      </div>
    </header>
  );
}
