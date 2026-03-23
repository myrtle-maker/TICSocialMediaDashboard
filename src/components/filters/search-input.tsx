"use client";

import { Search, X } from "lucide-react";
import { useFilters } from "./filter-context";
import { useState, useEffect } from "react";

export function SearchInput() {
  const { filters, updateFilter } = useFilters();
  const [localValue, setLocalValue] = useState(filters.searchQuery);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter("searchQuery", localValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, updateFilter]);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
      <input
        type="text"
        placeholder="Search captions, hashtags..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-8 text-xs placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            updateFilter("searchQuery", "");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
