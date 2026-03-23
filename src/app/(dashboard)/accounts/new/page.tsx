"use client";

import { useState } from "react";
import Link from "next/link";
import { PLATFORMS, PLATFORM_CONFIG } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/types/social";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";

export default function AddAccountPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  );
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !username.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500" />
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                Account Added Successfully
              </h3>
              <p className="mb-1 text-sm text-zinc-600">
                <span className="font-medium">@{username}</span> on{" "}
                {selectedPlatform && PLATFORM_CONFIG[selectedPlatform].label}
              </p>
              <p className="mb-6 text-xs text-zinc-400">
                The first scrape will run shortly. Data will appear on your
                dashboard once the scrape completes.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setSelectedPlatform(null);
                    setUsername("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Another</span>
                </Button>
                <Link href="/accounts">
                  <Button>View Accounts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/accounts"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Add Account</h2>
          <p className="text-sm text-zinc-500">
            Connect a new social media account for tracking.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Select Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Platform Selection */}
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  const isSelected = selectedPlatform === platform;
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setSelectedPlatform(platform)}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <PlatformIcon platform={platform} size="md" />
                      <span className="text-xs font-medium text-zinc-700">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Username Input */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Username or Profile URL
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder={
                    selectedPlatform
                      ? `e.g. @yourhandle or ${PLATFORM_CONFIG[selectedPlatform].label.toLowerCase()}.com/yourhandle`
                      : "Select a platform first"
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!selectedPlatform}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Enter the username without the @ symbol, or paste the full
                  profile URL.
                </p>
              </div>

              {/* Info */}
              {selectedPlatform && (
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-600">
                    We will use the Apify{" "}
                    <Badge variant="secondary" className="text-[10px]">
                      {PLATFORM_CONFIG[selectedPlatform].label} Scraper
                    </Badge>{" "}
                    to fetch public post data. The initial scrape may take a few
                    minutes depending on the number of posts.
                  </p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={!selectedPlatform || !username.trim()}
              >
                <Plus className="h-4 w-4" />
                <span>Add Account</span>
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
