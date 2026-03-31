"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { Plus, Users, Trash2, Loader2, RefreshCw, CheckSquare, Square, Play } from "lucide-react";
import type { SocialAccount } from "@/types/social";

type ScrapeStatus = "idle" | "starting" | "running" | "done" | "failed";

interface AccountScrapeState {
  status: ScrapeStatus;
  message?: string;
  postsCollected?: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scrapeStates, setScrapeStates] = useState<Record<string, AccountScrapeState>>({});
  const [bulkScraping, setBulkScraping] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      await loadAccounts();
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === accounts.length ? new Set() : new Set(accounts.map((a) => a.id)));
  };

  function setAccountScrapeState(id: string, state: AccountScrapeState) {
    setScrapeStates((prev) => ({ ...prev, [id]: state }));
  }

  async function pollUntilDone(accountIds: string[]) {
    let attempts = 0;
    const maxAttempts = 24; // 6 minutes at 15s intervals
    return new Promise<void>((resolve) => {
      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch("/api/scrape/collect", { method: "POST" });
          const data = await res.json();

          // Map results back to individual account states
          if (data.results) {
            for (const r of data.results as { jobId: string; platform: string; status: string; postsCollected: number; error?: string }[]) {
              // Results are keyed by jobId/platform, not accountId — find matching accounts
              const matchingAccounts = accounts.filter(
                (a) => a.platform === r.platform && accountIds.includes(a.id)
              );
              for (const acct of matchingAccounts) {
                if (r.status === "collected") {
                  setAccountScrapeState(acct.id, {
                    status: "done",
                    postsCollected: r.postsCollected,
                    message: `${r.postsCollected} posts collected`,
                  });
                } else if (r.status === "failed" || r.status === "FAILED" || r.status === "error") {
                  setAccountScrapeState(acct.id, {
                    status: "failed",
                    message: r.error ?? "Scrape failed",
                  });
                }
              }
            }
          }

          const stillRunning = data.results?.some((r: { status: string }) => r.status === "still_running");
          if (!stillRunning || attempts >= maxAttempts) {
            clearInterval(poll);
            // Mark any still-running as done (timed out)
            for (const id of accountIds) {
              setScrapeStates((prev) => {
                if (prev[id]?.status === "running") {
                  return { ...prev, [id]: { status: "done", message: "Completed" } };
                }
                return prev;
              });
            }
            await loadAccounts();
            resolve();
          }
        } catch {
          // keep polling
        }
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          resolve();
        }
      }, 15000);
    });
  }

  async function startScrape(accountIds: string[]) {
    // Mark all as starting
    for (const id of accountIds) {
      setAccountScrapeState(id, { status: "starting" });
    }

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        for (const id of accountIds) {
          setAccountScrapeState(id, { status: "failed", message: data.error ?? "Failed to start" });
        }
        return;
      }

      // Update per-account status based on API response
      for (const result of data.results ?? []) {
        const acct = accounts.find((a) => a.id === result.accountId);
        if (!acct) continue;
        if (result.status === "started") {
          setAccountScrapeState(acct.id, { status: "running" });
        } else if (result.status === "failed") {
          setAccountScrapeState(acct.id, { status: "failed", message: result.error });
        } else if (result.status === "skipped") {
          setAccountScrapeState(acct.id, { status: "failed", message: result.error ?? "Skipped" });
        }
      }

      // Poll for completion
      await pollUntilDone(accountIds);
    } catch (err) {
      for (const id of accountIds) {
        setAccountScrapeState(id, { status: "failed", message: err instanceof Error ? err.message : "Error" });
      }
    }
  }

  async function handleScrapeAccount(id: string) {
    await startScrape([id]);
  }

  async function handleScrapeSelected() {
    if (selected.size === 0) return;
    setBulkScraping(true);
    await startScrape([...selected]);
    setBulkScraping(false);
  }

  async function handleScrapeAll() {
    setBulkScraping(true);
    await startScrape(accounts.map((a) => a.id));
    setBulkScraping(false);
  }

  const isScraping = (id: string) => {
    const s = scrapeStates[id]?.status;
    return s === "starting" || s === "running";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Accounts</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage and scrape your tracked social media accounts.
          </p>
        </div>
        <Link href="/accounts/new">
          <Button>
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {accounts.length}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {new Set(accounts.map((a) => a.platform)).size}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatNumber(accounts.reduce((s, a) => s + (a.followers ?? 0), 0))}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Followers</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk action toolbar */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {selected.size === accounts.length ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selected.size === accounts.length ? "Deselect all" : "Select all"}
          </button>

          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrapeSelected}
              disabled={bulkScraping}
            >
              {bulkScraping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Scrape selected ({selected.size})
            </Button>
          )}

          {selected.size === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrapeAll}
              disabled={bulkScraping}
            >
              {bulkScraping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Scrape all
            </Button>
          )}
        </div>
      )}

      {/* Account List */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => {
            const config = PLATFORM_CONFIG[account.platform];
            const scrape = scrapeStates[account.id];
            const scraping = isScraping(account.id);
            const isSelected = selected.has(account.id);

            return (
              <div
                key={account.id}
                className={`flex items-center gap-3 rounded-xl border bg-white p-4 transition-all dark:bg-zinc-900 ${
                  isSelected
                    ? "border-blue-300 ring-1 ring-blue-200 dark:border-blue-700 dark:ring-blue-900"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(account.id)}
                  className="shrink-0 text-zinc-300 transition-colors hover:text-blue-500 dark:text-zinc-600 dark:hover:text-blue-400"
                  title={isSelected ? "Deselect" : "Select"}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                <PlatformIcon platform={account.platform} size="lg" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      @{account.handle}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {account.lastScrapedAt
                        ? `Last scraped: ${new Date(account.lastScrapedAt).toLocaleDateString()}`
                        : "Not yet scraped"}
                    </p>
                    {/* Inline scrape status */}
                    {scrape && (
                      <span
                        className={`text-xs font-medium ${
                          scrape.status === "done"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : scrape.status === "failed"
                              ? "text-red-500 dark:text-red-400"
                              : "text-blue-500 dark:text-blue-400"
                        }`}
                      >
                        {scrape.status === "starting" && "Starting…"}
                        {scrape.status === "running" && "Scraping…"}
                        {scrape.status === "done" && (scrape.message ?? "Done")}
                        {scrape.status === "failed" && (scrape.message ?? "Failed")}
                      </span>
                    )}
                  </div>
                </div>

                {(account.followers ?? 0) > 0 && (
                  <div className="hidden text-center sm:block">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(account.followers)}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Followers</p>
                  </div>
                )}

                {/* Per-account scrape button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScrapeAccount(account.id)}
                  disabled={scraping || bulkScraping}
                  title="Scrape this account"
                  className="shrink-0"
                >
                  {scraping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Scrape</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                  onClick={() => handleRemove(account.id)}
                  disabled={removing === account.id || scraping}
                  title="Remove account"
                >
                  {removing === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
          <Users className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No accounts yet
          </h3>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Add your first social media account to start tracking.
          </p>
          <Link href="/accounts/new">
            <Button>
              <Plus className="h-4 w-4" />
              <span>Add Account</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
