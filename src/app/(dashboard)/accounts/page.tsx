"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLATFORM_CONFIG } from "@/lib/constants";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { Plus, Users, Trash2 } from "lucide-react";
import { getSavedAccounts, removeAccount } from "@/lib/store";
import type { SocialAccount } from "@/types/social";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadAccounts = useCallback(() => {
    setAccounts(getSavedAccounts());
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAccounts();
  }, [loadAccounts]);

  const handleRemove = (id: string) => {
    removeAccount(id);
    loadAccounts();
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Accounts</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
              {formatNumber(accounts.reduce((s, a) => s + a.followers, 0))}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Followers</p>
          </CardContent>
        </Card>
      </div>

      {/* Account List */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => {
            const config = PLATFORM_CONFIG[account.platform];
            return (
              <Card key={account.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {account.lastScrapedAt
                        ? `Last scraped: ${new Date(account.lastScrapedAt).toLocaleDateString()}`
                        : "Not yet scraped — configure Apify API token in Settings"}
                    </p>
                  </div>
                  {account.followers > 0 && (
                    <div className="hidden text-center sm:block">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {formatNumber(account.followers)}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Followers</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                    onClick={() => handleRemove(account.id)}
                    title="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
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
