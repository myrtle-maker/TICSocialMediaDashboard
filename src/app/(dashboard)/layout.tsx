"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FilterBar } from "@/components/layout/filter-bar";
import { FilterProvider } from "@/components/filters/filter-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <FilterBar />
          <main className="flex-1 overflow-y-auto bg-zinc-50 p-6 dark:bg-zinc-950">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
