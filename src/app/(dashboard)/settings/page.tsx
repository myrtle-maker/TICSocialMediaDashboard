"use client";

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
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure your data sources, API keys, and scrape schedules.
        </p>
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
            <Badge variant="warning">Not Configured</Badge>
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
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <Button variant="outline">Save</Button>
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Get your API token from{" "}
              <span className="text-blue-600">console.apify.com/account</span>.
              It is stored securely and never exposed to the browser.
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
                <select className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
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
                <select className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
                  <option>10 posts</option>
                  <option>25 posts</option>
                  <option>50 posts</option>
                  <option>100 posts</option>
                </select>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            <span>Run Scrape Now</span>
          </Button>
        </CardContent>
      </Card>

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
              <p className="text-sm font-medium text-zinc-700">
                Storage Mode
              </p>
              <Badge variant="secondary" className="mt-1">
                In-Memory (Seed Data)
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Data is reset on page reload. Connect a database for
                persistence.
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
              <Shield className="mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-zinc-700">
                Data Privacy
              </p>
              <Badge variant="success" className="mt-1">
                Local Only
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                All data stays on your machine. No telemetry is sent.
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-zinc-700">
                Last Refresh
              </p>
              <Badge variant="secondary" className="mt-1">
                On Page Load
              </Badge>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Seed data loaded automatically on each session start.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reset All Data
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Clear all scraped data and reset to seed data. This action
                cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Reset Data
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Remove API Token
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Delete the stored Apify API token from this application.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Remove Token
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
