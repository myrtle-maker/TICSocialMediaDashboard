/**
 * Client-side persistence layer using localStorage.
 *
 * Stores accounts, settings, and posts until a database is connected.
 * All functions are safe to call during SSR (they return defaults).
 */

import type { SocialAccount, SocialPost, Platform } from "@/types/social";
import { generateId } from "@/lib/utils";

const KEYS = {
  accounts: "tic-accounts",
  settings: "tic-settings",
  posts: "tic-posts",
} as const;

// ---- Helpers ----

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---- Settings ----

export interface AppSettings {
  apifyApiToken: string;
  scrapeFrequency: string;
  postsPerScrape: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  apifyApiToken: "",
  scrapeFrequency: "Every 24 hours",
  postsPerScrape: "50 posts",
};

export function getSettings(): AppSettings {
  return read(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  write(KEYS.settings, updated);
  return updated;
}

export function clearSettings(): void {
  if (isBrowser()) localStorage.removeItem(KEYS.settings);
}

// ---- Accounts ----

export function getSavedAccounts(): SocialAccount[] {
  return read<SocialAccount[]>(KEYS.accounts, []);
}

export function saveAccount(platform: Platform, handle: string): SocialAccount {
  const accounts = getSavedAccounts();

  const existing = accounts.find(
    (a) => a.platform === platform && a.handle.toLowerCase() === handle.toLowerCase()
  );
  if (existing) return existing;

  const account: SocialAccount = {
    id: `acct-${generateId()}`,
    platform,
    platformAccountId: handle,
    handle: handle.replace(/^@/, ""),
    displayName: handle.replace(/^@/, ""),
    profileImageUrl: null,
    bio: null,
    followers: 0,
    following: 0,
    totalPosts: 0,
    verified: false,
    accountType: "business",
    category: null,
    externalUrl: null,
    lastScrapedAt: null,
    createdAt: new Date(),
  };

  accounts.push(account);
  write(KEYS.accounts, accounts);
  return account;
}

export function removeAccount(id: string): void {
  const accounts = getSavedAccounts().filter((a) => a.id !== id);
  write(KEYS.accounts, accounts);
}

export function clearAccounts(): void {
  if (isBrowser()) localStorage.removeItem(KEYS.accounts);
}

// ---- Posts (for future use when Apify data comes in) ----

export function getSavedPosts(): SocialPost[] {
  return read<SocialPost[]>(KEYS.posts, []);
}

export function savePosts(newPosts: SocialPost[]): void {
  const existing = getSavedPosts();
  const existingIds = new Set(existing.map((p) => p.platformPostId));
  const unique = newPosts.filter((p) => !existingIds.has(p.platformPostId));
  write(KEYS.posts, [...existing, ...unique]);
}

export function clearPosts(): void {
  if (isBrowser()) localStorage.removeItem(KEYS.posts);
}

// ---- Clear all ----

export function clearAllData(): void {
  clearAccounts();
  clearPosts();
  // Keep settings (API token etc.)
}
