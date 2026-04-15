"use client";

import { PlatformToggle } from "@/components/filters/platform-toggle";
import { SortDropdown } from "@/components/filters/sort-dropdown";
import { SearchInput } from "@/components/filters/search-input";
import { useFilters } from "@/components/filters/filter-context";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export function FilterBar() {
  const { activeFilterCount, resetFilters } = useFilters();

  return (
    <div className="border-b glass-bar px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span
              aria-label={`${activeFilterCount} active filter${activeFilterCount !== 1 ? "s" : ""}`}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {activeFilterCount}
            </span>
          )}
        </div>

        <PlatformToggle />

        <div className="ml-auto flex items-center gap-3">
          <SearchInput />
          <SortDropdown />
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
