"use client";

import { SORT_OPTIONS } from "@/lib/constants";
import { useFilters } from "./filter-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SortDropdown() {
  const { filters, updateFilter } = useFilters();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.sortBy}
        onValueChange={(val) => updateFilter("sortBy", val as typeof filters.sortBy)}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() =>
          updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")
        }
        title={filters.sortOrder === "asc" ? "Ascending" : "Descending"}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
