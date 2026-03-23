"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getAccounts, getPosts } from "@/lib/db";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { Plus, Users, ExternalLink } from "lucide-react";

export default function AccountsPage() {
  const accounts = useMemo(() => getAccounts(), []);
  const allPosts = useMemo(() => getPosts(), []);

  const accountsWithStats = useMemo(
    () =>
      accounts.map((account) => {
        const posts = allPosts.filter((p) => p.accountId === account.id);
        const totalEngagement = posts.reduce(
          (s, p) => s + p.likes + p.comments + p.shares + p.saves,
          0
        );
        return {
          ...account,
          postCount: posts.length,
          totalEngagement,
        };
      }),
    [accounts, allPosts]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Accounts</h2>
          <p className="text-sm text-zinc-500">
            Manage your tracked social media accounts.
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {accounts.length}
            </p>
            <p className="text-xs text-zinc-500">Total Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {new Set(accounts.map((a) => a.platform)).size}
            </p>
            <p className="text-xs text-zinc-500">Platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {formatNumber(
                accounts.reduce((s, a) => s + a.followers, 0)
              )}
            </p>
            <p className="text-xs text-zinc-500">Total Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {formatNumber(allPosts.length)}
            </p>
            <p className="text-xs text-zinc-500">Total Posts</p>
          </CardContent>
        </Card>
      </div>

      {/* Account List */}
      <div className="space-y-3">
        {accountsWithStats.map((account) => {
          const config = PLATFORM_CONFIG[account.platform];
          return (
            <Card
              key={account.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <PlatformIcon platform={account.platform} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {account.displayName}
                    </h3>
                    {account.verified && (
                      <Badge variant="success" className="text-[10px]">
                        Verified
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {account.accountType}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    @{account.handle} on {config.label}
                  </p>
                </div>
                <div className="hidden gap-6 text-center sm:flex">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {formatNumber(account.followers)}
                    </p>
                    <p className="text-[10px] text-zinc-500">Followers</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {formatNumber(account.postCount)}
                    </p>
                    <p className="text-[10px] text-zinc-500">Posts</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {formatNumber(account.totalEngagement)}
                    </p>
                    <p className="text-[10px] text-zinc-500">Engagement</p>
                  </div>
                </div>
                <div className="hidden text-right lg:block">
                  <p className="text-[10px] text-zinc-400">Last scraped</p>
                  <p className="text-xs text-zinc-600">
                    {account.lastScrapedAt
                      ? formatRelativeTime(account.lastScrapedAt)
                      : "Never"}
                  </p>
                </div>
                {account.externalUrl && (
                  <a
                    href={account.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-400 hover:text-zinc-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-zinc-300" />
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">
            No accounts yet
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
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
