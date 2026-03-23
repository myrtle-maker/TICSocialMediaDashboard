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
    <div className="border-b border-zinc-200 bg-zinc-50/50 px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">
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
