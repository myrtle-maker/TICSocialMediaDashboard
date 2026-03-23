"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { PLATFORMS, PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
}

interface CollectResult {
  jobId: string;
  platform: string;
  status: string;
  postsCollected: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { number: 1, label: "API Key" },
    { number: 2, label: "Accounts" },
    { number: 3, label: "Collect" },
  ];

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                step.number < current
                  ? "bg-emerald-500 text-white"
                  : step.number === current
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {step.number < current ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium ${
                step.number <= current
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`mx-3 mb-5 h-0.5 w-16 sm:w-24 ${
                step.number < current
                  ? "bg-emerald-500"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform handle placeholders
// ---------------------------------------------------------------------------

const HANDLE_PLACEHOLDERS: Record<Platform, string> = {
  tiktok: "@username",
  instagram: "@username",
  youtube: "@channelname",
  twitter: "@handle",
  facebook: "pagename",
  linkedin: "company/your-company",
};

// ---------------------------------------------------------------------------
// Scrape status messages
// ---------------------------------------------------------------------------

const SCRAPE_MESSAGES = [
  "Initializing data collectors...",
  "Connecting to platforms...",
  "Fetching recent posts...",
  "Processing content data...",
  "Analyzing engagement metrics...",
  "Almost there...",
];

// ---------------------------------------------------------------------------
// Main setup page
// ---------------------------------------------------------------------------

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Step 1 state
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [existingToken, setExistingToken] = useState(false);

  // Step 2 state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Step 3 state
  const [scraping, setScraping] = useState(false);
  const [scrapeStarted, setScrapeStarted] = useState(false);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [scrapeMessageIndex, setScrapeMessageIndex] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [platformCount, setPlatformCount] = useState(0);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Load existing data on mount
  useEffect(() => {
    setMounted(true);

    // Check for existing token
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings ?? {};
        if (s.apifyApiToken) {
          setApiToken(s.apifyApiToken);
          setExistingToken(true);
          setTokenSaved(true);
        }
      })
      .catch(() => {});

    // Load existing accounts
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.accounts?.length > 0) {
          setAccounts(data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  // Cycle through scrape messages
  useEffect(() => {
    if (!scraping) return;
    const interval = setInterval(() => {
      setScrapeMessageIndex((prev) =>
        prev < SCRAPE_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [scraping]);

  // ---- Step 1: Save API token ----

  const handleSaveToken = async () => {
    if (!apiToken.trim()) return;
    setTokenSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "apifyApiToken", value: apiToken.trim() }),
      });
      if (res.ok) {
        setTokenSaved(true);
        setExistingToken(true);
      }
    } catch {
      // ignore
    } finally {
      setTokenSaving(false);
    }
  };

  // ---- Step 2: Add account ----

  const handleAddAccount = async () => {
    if (!selectedPlatform || !handle.trim()) return;
    setAddingAccount(true);
    setAccountError(null);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          handle: handle.trim(),
          displayName: displayName.trim() || handle.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAccountError(data.error || "Failed to add account");
        return;
      }

      setAccounts((prev) => [data.account, ...prev]);
      setSelectedPlatform(null);
      setHandle("");
      setDisplayName("");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setAddingAccount(false);
    }
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Step 3: Scrape ----

  const handleStartScrape = useCallback(async () => {
    setScraping(true);
    setScrapeStarted(true);
    setScrapeError(null);
    setScrapeMessageIndex(0);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeAll: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScrapeError(data.error || "Failed to start data collection");
        setScraping(false);
        return;
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes at 10s intervals
      const poll = setInterval(async () => {
        attempts++;
        try {
          const collectRes = await fetch("/api/scrape/collect", { method: "POST" });
          const collectData = await collectRes.json();

          const stillRunning = collectData.results?.some(
            (r: CollectResult) => r.status === "still_running"
          );

          if (!stillRunning || attempts >= maxAttempts) {
            clearInterval(poll);
            setScraping(false);
            setScrapeComplete(true);

            const collected = collectData.totalCollected || 0;
            setTotalPosts(collected);

            const platforms = new Set(
              collectData.results
                ?.filter((r: CollectResult) => r.postsCollected > 0)
                .map((r: CollectResult) => r.platform) || []
            );
            setPlatformCount(platforms.size);
          }
        } catch {
          // ignore poll errors
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setScraping(false);
          setScrapeComplete(true);
        }
      }, 10000);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Failed to start collection");
      setScraping(false);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            TIC Social Media Insights
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Setup wizard
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {/* Progress indicator */}
          <div className="mb-10">
            <StepIndicator current={step} />
          </div>

          {/* ============================================================= */}
          {/* STEP 1: API Key */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Key className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Connect to Apify
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Enter your Apify API token to enable social media data
                  collection.
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="api-token"
                        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        API Token
                      </label>
                      <div className="relative">
                        <input
                          id="api-token"
                          type={showToken ? "text" : "password"}
                          placeholder="apify_api_xxxxxxxxxxxxx"
                          value={apiToken}
                          onChange={(e) => {
                            setApiToken(e.target.value);
                            setTokenSaved(false);
                          }}
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          {showToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                        Get your token from{" "}
                        <a
                          href="https://console.apify.com/account#/integrations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          console.apify.com
                        </a>
                      </p>
                    </div>

                    {existingToken && tokenSaved && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <Check className="h-4 w-4 shrink-0" />
                        API token is configured
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveToken}
                        disabled={!apiToken.trim() || tokenSaving}
                        className="flex-1"
                      >
                        {tokenSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : tokenSaved ? (
                          <Check className="h-4 w-4" />
                        ) : null}
                        <span>
                          {tokenSaving
                            ? "Saving..."
                            : tokenSaved
                              ? "Saved"
                              : "Save Token"}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setStep(2)}
                        disabled={!tokenSaved && !apiToken.trim()}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  I&apos;ll do this later
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 2: Add Accounts */}
          {/* ============================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Plus className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Add Your First Account
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Connect a social media account to start tracking.
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-5">
                  {/* Platform selector */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Platform
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {PLATFORMS.map((platform) => {
                        const config = PLATFORM_CONFIG[platform];
                        const isSelected = selectedPlatform === platform;
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => setSelectedPlatform(platform)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                              isSelected
                                ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <PlatformIcon platform={platform} size="sm" />
                            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Handle input */}
                  <div>
                    <label
                      htmlFor="handle"
                      className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Handle / Username
                    </label>
                    <input
                      id="handle"
                      type="text"
                      placeholder={
                        selectedPlatform
                          ? HANDLE_PLACEHOLDERS[selectedPlatform]
                          : "Select a platform first"
                      }
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      disabled={!selectedPlatform}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800"
                    />
                  </div>

                  {/* Display name */}
                  <div>
                    <label
                      htmlFor="display-name"
                      className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Display Name{" "}
                      <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      placeholder="e.g. My Brand"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!selectedPlatform}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800"
                    />
                  </div>

                  {/* Error */}
                  {accountError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {accountError}
                    </div>
                  )}

                  {/* Add account button */}
                  <Button
                    onClick={handleAddAccount}
                    disabled={!selectedPlatform || !handle.trim() || addingAccount}
                    className="w-full"
                  >
                    {addingAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>{addingAccount ? "Adding..." : "Add Account"}</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Added accounts list */}
              {accounts.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Added accounts ({accounts.length})
                    </p>
                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-100 p-2.5 dark:border-zinc-800"
                        >
                          <div className="flex items-center gap-2.5">
                            <PlatformIcon
                              platform={account.platform as Platform}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                @{account.handle}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {PLATFORM_CONFIG[account.platform as Platform]?.label}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    Skip
                  </button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={accounts.length === 0}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 3: First Scrape */}
          {/* ============================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Sparkles className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Collect Your Data
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  We&apos;ll fetch your latest posts from the connected platforms.
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  {/* Not started */}
                  {!scrapeStarted && !scrapeComplete && (
                    <div className="space-y-4">
                      {accounts.length > 0 ? (
                        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Ready to collect data from:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {accounts.map((a) => (
                              <Badge key={a.id} variant="secondary">
                                @{a.handle}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          No accounts added yet. Go back to add at least one account before collecting data.
                        </div>
                      )}

                      {scrapeError && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                          {scrapeError}
                        </div>
                      )}

                      <Button
                        onClick={handleStartScrape}
                        disabled={accounts.length === 0 || !existingToken}
                        className="w-full"
                        size="lg"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Start Collection</span>
                      </Button>

                      {!existingToken && accounts.length > 0 && (
                        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                          API token required. Go back to Step 1 to add it.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Scraping in progress */}
                  {scraping && (
                    <div className="flex flex-col items-center py-8">
                      <div className="relative mb-6">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                      </div>
                      <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Collecting data...
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 transition-all">
                        {SCRAPE_MESSAGES[scrapeMessageIndex]}
                      </p>
                      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
                        This usually takes 1-3 minutes
                      </p>
                    </div>
                  )}

                  {/* Scrape complete */}
                  {scrapeComplete && (
                    <div className="flex flex-col items-center py-6">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        All set!
                      </h3>
                      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                        {totalPosts > 0
                          ? `We collected ${totalPosts} posts across ${platformCount} platform${platformCount !== 1 ? "s" : ""}.`
                          : "Collection started. Data will appear on your dashboard shortly."}
                      </p>
                      <Button
                        onClick={() => router.push("/")}
                        size="lg"
                        className="w-full max-w-xs"
                      >
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              {!scraping && !scrapeComplete && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    Skip and go to dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
