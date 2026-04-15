"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { FilterBar } from "@/components/layout/filter-bar";
import { FilterProvider } from "@/components/filters/filter-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only check once per session
    const checked = sessionStorage.getItem("tic-setup-checked");
    if (checked) {
      setReady(true);
      return;
    }

    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data) => {
        sessionStorage.setItem("tic-setup-checked", "1");
        if (data.needsSetup && data.accountCount === 0) {
          router.replace("/setup");
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        // If check fails, show dashboard anyway
        setReady(true);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <FilterProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <FilterBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
