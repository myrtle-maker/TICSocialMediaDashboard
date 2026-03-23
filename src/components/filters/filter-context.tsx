"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PostFilters, Platform, ContentType, HookType } from "@/types/social";
import { DEFAULT_FILTERS } from "@/lib/constants";

interface FilterContextType {
  filters: PostFilters;
  setFilters: (filters: PostFilters) => void;
  updateFilter: <K extends keyof PostFilters>(key: K, value: PostFilters[K]) => void;
  resetFilters: () => void;
  togglePlatform: (platform: Platform) => void;
  toggleContentType: (contentType: ContentType) => void;
  toggleHookType: (hookType: HookType) => void;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<PostFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(
    <K extends keyof PostFilters>(key: K, value: PostFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const togglePlatform = useCallback((platform: Platform) => {
    setFilters((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }, []);

  const toggleContentType = useCallback((contentType: ContentType) => {
    setFilters((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(contentType)
        ? prev.contentTypes.filter((c) => c !== contentType)
        : [...prev.contentTypes, contentType],
    }));
  }, []);

  const toggleHookType = useCallback((hookType: HookType) => {
    setFilters((prev) => ({
      ...prev,
      hookTypes: prev.hookTypes.includes(hookType)
        ? prev.hookTypes.filter((h) => h !== hookType)
        : [...prev.hookTypes, hookType],
    }));
  }, []);

  const activeFilterCount =
    filters.platforms.length +
    filters.contentTypes.length +
    filters.hookTypes.length +
    (filters.dateRange ? 1 : 0) +
    (filters.minEngagementRate !== null ? 1 : 0) +
    (filters.minViews !== null ? 1 : 0) +
    (filters.searchQuery ? 1 : 0) +
    filters.hashtags.length;

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        togglePlatform,
        toggleContentType,
        toggleHookType,
        activeFilterCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
