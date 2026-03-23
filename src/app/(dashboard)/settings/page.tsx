"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Key,
  Clock,
  RefreshCw,
  Database,
  Shield,
  HardDrive,
  Check,
  AlertTriangle,
  Loader2,
  Mail,
  X,
  Plus,
} from "lucide-react";
import { useFilters } from "@/components/filters/filter-context";

export default function SettingsPage() {
  const { triggerRefresh } = useFilters();
  const [apiToken, setApiToken] = useState("");
  const [scrapeFrequency, setScrapeFrequency] = useState("Every 24 hours");
  const [postsPerScrape, setPostsPerScrape] = useState("50 posts");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemoveToken, setConfirmRemoveToken] = useState(false);
  // Email digest state
  const [subscribers, setSubscribers] = useState<
    { id: string; email: string; name: string | null; active: boolean; createdAt: string }[]
  >([]);
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [subAdding, setSubAdding] = useState(false);
  const [subError, setSubError] = useState("");
  const [subSuccess, setSubSuccess] = useState("");
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<string | null>(null);

  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    success: boolean;
    message?: string;
    totalPostsScraped?: number;
    results?: { handle: string; platform: string; status: string; postsScraped: number; error?: string }[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Load settings from DB
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings ?? {};
        if (s.apifyApiToken) {
          setApiToken(s.apifyApiToken);
          setTokenConfigured(true);
        }
        if (s.scrapeFrequency) setScrapeFrequency(s.scrapeFrequency);
        if (s.postsPerScrape) setPostsPerScrape(s.postsPerScrape);
      })
      .catch(() => {});

    // Load email subscribers
    fetch("/api/email/subscribers")
      .then((r) => r.json())
      .then((data) => setSubscribers((data.subscribers ?? []).filter((s: { active: boolean }) => s.active)))
      .catch(() => {});

    // Load account count
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccountCount(data.accounts?.length ?? 0))
      .catch(() => {});
  }, []);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveSetting = async (key: string, value: string) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  };

  const handleSaveToken = async () => {
    setSaving(true);
    try {
      await saveSetting("apifyApiToken", apiToken.trim());
      setTokenConfigured(!!apiToken.trim());
      showSaved();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("scrapeFrequency", scrapeFrequency),
        saveSetting("postsPerScrape", postsPerScrape),
      ]);
      showSaved();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleRunScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      // Step 1: Start the scrape jobs
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeAll: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeResult({ success: false, error: data.error });
        setScraping(false);
        return;
      }

      // Show "started" status immediately
      setScrapeResult({
        success: true,
        message: data.message,
        results: data.results?.map((r: { handle: string; platform: string; status: string; error?: string }) => ({
          handle: r.handle,
          platform: r.platform,
          status: r.status,
          postsScraped: 0,
          error: r.error,
        })),
      });

      // Step 2: Poll for completion every 15 seconds, up to 5 minutes
      let attempts = 0;
      const maxAttempts = 20;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const collectRes = await fetch("/api/scrape/collect", { method: "POST" });
          const collectData = await collectRes.json();

          if (collectData.totalCollected > 0 || attempts >= maxAttempts) {
            clearInterval(poll);
            setScraping(false);
            setScrapeResult({
              success: true,
              totalPostsScraped: collectData.totalCollected,
              results: collectData.results?.map((r: { platform: string; status: string; postsCollected: number; error?: string }) => ({
                handle: r.platform,
                platform: r.platform,
                status: r.status,
                postsScraped: r.postsCollected,
                error: r.error,
              })),
            });
            triggerRefresh();
            // Refresh account count
            fetch("/api/accounts")
              .then((r) => r.json())
              .then((d) => setAccountCount(d.accounts?.length ?? 0))
              .catch(() => {});
          }

          // Check if all jobs finished (none still_running)
          const stillRunning = collectData.results?.some((r: { status: string }) => r.status === "still_running");
          if (!stillRunning && attempts < maxAttempts) {
            clearInterval(poll);
            setScraping(false);
            setScrapeResult({
              success: true,
              totalPostsScraped: collectData.totalCollected,
              results: collectData.results?.map((r: { platform: string; status: string; postsCollected: number; error?: string }) => ({
                handle: r.platform,
                platform: r.platform,
                status: r.status,
                postsScraped: r.postsCollected,
                error: r.error,
              })),
            });
            triggerRefresh();
          }
        } catch {
          // Ignore poll errors, keep trying
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setScraping(false);
        }
      }, 15000);
    } catch (err) {
      setScrapeResult({ success: false, error: err instanceof Error ? err.message : "Scrape request failed" });
      setScraping(false);
    }
  };

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const loadSubscribers = async () => {
    try {
      const r = await fetch("/api/email/subscribers");
      const data = await r.json();
      setSubscribers((data.subscribers ?? []).filter((s: { active: boolean }) => s.active));
    } catch {}
  };

  const handleAddSubscriber = async () => {
    setSubError("");
    setSubSuccess("");
    const email = newSubEmail.trim().toLowerCase();
    if (!email) {
      setSubError("Email is required");
      return;
    }
    if (!emailRe.test(email)) {
      setSubError("Invalid email format");
      return;
    }
    setSubAdding(true);
    try {
      const res = await fetch("/api/email/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: newSubName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || "Failed to add subscriber");
      } else {
        setSubSuccess(`${email} added`);
        setNewSubEmail("");
        setNewSubName("");
        setTimeout(() => setSubSuccess(""), 3000);
        await loadSubscribers();
      }
    } catch {
      setSubError("Failed to add subscriber");
    } finally {
      setSubAdding(false);
    }
  };

  const handleRemoveSubscriber = async (id: string) => {
    try {
      await fetch(`/api/email/subscribers/${id}`, { method: "DELETE" });
      await loadSubscribers();
    } catch {}
  };

  const handleSendDigestNow = async () => {
    setSendingDigest(true);
    setDigestResult(null);
    try {
      const res = await fetch("/api/email/digest", { method: "POST" });
      const data = await res.json();
      if (data.sent > 0) {
        setDigestResult(`Digest sent to ${data.sent} subscriber${data.sent !== 1 ? "s" : ""}`);
      } else if (data.errors?.length > 0) {
        setDigestResult(`Failed: ${data.errors[0]}`);
      } else {
        setDigestResult("No emails sent (no subscribers or no recent posts)");
      }
    } catch {
      setDigestResult("Failed to send digest");
    } finally {
      setSendingDigest(false);
      setTimeout(() => setDigestResult(null), 5000);
    }
  };

  const handleRemoveToken = async () => {
    if (!confirmRemoveToken) {
      setConfirmRemoveToken(true);
      setTimeout(() => setConfirmRemoveToken(false), 3000);
      return;
    }
    await saveSetting("apifyApiToken", "");
    setApiToken("");
    setTokenConfigured(false);
    setConfirmRemoveToken(false);
    showSaved();
  };

  const handleResetData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    // In a real app, this would call a DELETE /api/data endpoint
    setConfirmReset(false);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configure your data sources, API keys, and scrape schedules.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Saved to database
          </div>
        )}
      </div>

      {/* API Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Apify API Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">Status</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Required for scraping social media data via Apify actors.
              </p>
            </div>
            {tokenConfigured ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="warning">Not Configured</Badge>
            )}
          </div>
          <div>
            <label
              htmlFor="api-token"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              API Token
            </label>
            <div className="flex gap-2">
              <input
                id="api-token"
                type="password"
                placeholder="apify_api_xxxxxxxxxxxxx"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <Button variant="outline" onClick={handleSaveToken} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Get your API token from{" "}
              <a
                href="https://console.apify.com/account#/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                console.apify.com/account
              </a>
              . It is stored securely in the database.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scrape Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Scrape Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Frequency</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                How often new posts are fetched from each platform.
              </p>
              <div className="mt-3">
                <select
                  value={scrapeFrequency}
                  onChange={(e) => setScrapeFrequency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option>Every 6 hours</option>
                  <option>Every 12 hours</option>
                  <option>Every 24 hours</option>
                  <option>Every 3 days</option>
                  <option>Weekly</option>
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Posts per Scrape
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Maximum number of recent posts to fetch per account per run.
              </p>
              <div className="mt-3">
                <select
                  value={postsPerScrape}
                  onChange={(e) => setPostsPerScrape(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option>10 posts</option>
                  <option>25 posts</option>
                  <option>50 posts</option>
                  <option>100 posts</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveSchedule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Schedule"}
            </Button>
            <Button
              variant="outline"
              disabled={!tokenConfigured || accountCount === 0 || scraping}
              onClick={handleRunScrape}
            >
              {scraping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{scraping ? "Scraping..." : "Run Scrape Now"}</span>
            </Button>
            {!tokenConfigured && (
              <p className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Configure API token first
              </p>
            )}
            {accountCount === 0 && tokenConfigured && (
              <p className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Add accounts first
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Scraping (Vercel Cron) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Auto-Scraping (Vercel Cron)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Automated daily scraping via Vercel Cron Jobs
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Scrape runs daily at 9:00 AM UTC. Results are collected at 9:05 AM UTC.
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Next scheduled scrape:{" "}
                {(() => {
                  const now = new Date();
                  const next = new Date(now);
                  next.setUTCHours(9, 0, 0, 0);
                  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
                  return next.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short",
                  });
                })()}
              </p>
            </div>
            <Badge variant={tokenConfigured ? "success" : "warning"}>
              {tokenConfigured ? "Enabled" : "Set API token to enable"}
            </Badge>
          </div>
          {!tokenConfigured && (
            <p className="mt-2 flex items-center text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Configure your Apify API token above and set CRON_SECRET env var on Vercel to enable auto-scraping.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Email Digest
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Weekly digest sends every Monday at 10:00 AM UTC
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Subscribers receive a summary of top posts, engagement metrics, and insights.
              </p>
            </div>
            <Badge variant="secondary">
              {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Subscriber list */}
          {subscribers.length > 0 && (
            <div className="space-y-2">
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-sm text-zinc-900 dark:text-zinc-100">{sub.email}</span>
                    {sub.name && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">({sub.name})</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSubscriber(sub.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add subscriber form */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Add Subscriber
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={newSubEmail}
                onChange={(e) => {
                  setNewSubEmail(e.target.value);
                  setSubError("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <input
                type="text"
                placeholder="Name (optional)"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-36 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <Button variant="outline" onClick={handleAddSubscriber} disabled={subAdding}>
                {subAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Add</span>
              </Button>
            </div>
            {subError && (
              <p className="mt-1 flex items-center text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {subError}
              </p>
            )}
            {subSuccess && (
              <p className="mt-1 flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="mr-1 h-3 w-3" />
                {subSuccess}
              </p>
            )}
          </div>

          {/* Send now + status */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSendDigestNow}
              disabled={sendingDigest || subscribers.length === 0}
            >
              {sendingDigest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              <span>{sendingDigest ? "Sending..." : "Send Digest Now"}</span>
            </Button>
            {digestResult && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{digestResult}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scrape Results */}
      {scrapeResult && (
        <Card className={scrapeResult.success ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}>
          <CardHeader>
            <CardTitle className={`text-sm font-medium ${scrapeResult.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {scrapeResult.success
              ? scrapeResult.totalPostsScraped != null
                ? `Scrape Complete — ${scrapeResult.totalPostsScraped} posts collected`
                : "Scrape Jobs Started"
              : "Scrape Failed"}
            </CardTitle>
          </CardHeader>
          {scrapeResult.success && scrapeResult.message && (
            <CardContent>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{scrapeResult.message}</p>
            </CardContent>
          )}
          {scrapeResult.success && scrapeResult.results && (
            <CardContent>
              <div className="space-y-2">
                {scrapeResult.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-100 p-2.5 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">@{r.handle}</span>
                      <Badge variant="secondary" className="text-[10px]">{r.platform}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{r.postsScraped} posts</span>
                      <Badge variant={r.status === "succeeded" ? "success" : r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
          {!scrapeResult.success && scrapeResult.error && (
            <CardContent>
              <p className="text-sm text-red-600 dark:text-red-400">{scrapeResult.error}</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Data Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
              <HardDrive className="mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Storage</p>
              <Badge variant="success" className="mt-1">
                Vercel Postgres
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Data persists in a PostgreSQL database hosted on Vercel.
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
              <Shield className="mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Privacy</p>
              <Badge variant="success" className="mt-1">
                Secure
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                API tokens encrypted at rest. Data accessible only to your team.
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Accounts</p>
              <Badge variant="secondary" className="mt-1">
                {accountCount} tracked
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                {accountCount === 0
                  ? "Add accounts to start tracking."
                  : `Monitoring ${accountCount} account${accountCount !== 1 ? "s" : ""}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Remove API Token
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Delete the stored Apify API token from the database.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRemoveToken}>
              {confirmRemoveToken ? "Click again to confirm" : "Remove Token"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
