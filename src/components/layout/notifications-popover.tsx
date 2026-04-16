"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  BookOpen,
  Paperclip,
  KanbanSquare,
  Rocket,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  event: string;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  seenAt: string | null;
}

// ---------------------------------------------------------------------------
// Event icon / colour map
// ---------------------------------------------------------------------------

const EVENT_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; colour: string }
> = {
  guideCreated:    { icon: BookOpen,      colour: "text-emerald-500" },
  fileUploaded:    { icon: Paperclip,     colour: "text-blue-500"    },
  cardMoved:       { icon: KanbanSquare,  colour: "text-purple-500"  },
  ideaPromoted:    { icon: Rocket,        colour: "text-orange-500"  },
  postScheduled:   { icon: CalendarCheck, colour: "text-indigo-500"  },
  scrapeComplete:  { icon: CheckCircle2,  colour: "text-emerald-500" },
  performanceAlert:{ icon: AlertTriangle, colour: "text-amber-500"   },
};

const defaultMeta = { icon: Bell, colour: "text-zinc-400" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

function groupNotifications(
  notifications: Notification[],
  seenAt: string | null
): { label: string; items: (Notification & { unread: boolean })[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;

  const tagged = notifications.map((n) => ({
    ...n,
    unread: new Date(n.createdAt).getTime() > seenTime,
  }));

  const today     = tagged.filter((n) => new Date(n.createdAt).getTime() >= todayStart);
  const yesterday = tagged.filter(
    (n) =>
      new Date(n.createdAt).getTime() >= yesterdayStart &&
      new Date(n.createdAt).getTime() < todayStart
  );
  const earlier   = tagged.filter((n) => new Date(n.createdAt).getTime() < yesterdayStart);

  const groups = [];
  if (today.length)     groups.push({ label: "Today",     items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length)   groups.push({ label: "Earlier",   items: earlier });
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationsPopover({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const { data, mutate } = useSWR<NotificationsResponse>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000 }
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];
  const seenAt = data?.seenAt ?? null;
  const groups = groupNotifications(notifications, seenAt);

  // Mark all read when panel opens
  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await fetch("/api/notifications/read-all", { method: "POST" });
    mutate();
  }, [unreadCount, mutate]);

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function handleNotificationClick(n: Notification) {
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
        className={cn(
          "relative rounded-lg p-2 text-zinc-500 transition-colors",
          "hover:bg-white/40 hover:text-zinc-900",
          "dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-100",
          open && "bg-white/40 text-zinc-900 dark:bg-white/[0.07] dark:text-zinc-100"
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel — anchored just to the right of the sidebar so it never clips sidebar elements */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "fixed z-50 flex flex-col",
            "w-[360px] max-h-[520px]",
            "rounded-2xl border border-white/60 dark:border-white/[0.08]",
            "glass-card shadow-2xl shadow-black/10 dark:shadow-black/40",
            "overflow-hidden"
          )}
          style={{
            bottom: "16px",
            // sidebar is w-16 (64px) collapsed or w-64 (256px) expanded; add 8px gap
            left: collapsed ? "72px" : "264px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Notifications
              </h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-white/40 hover:text-zinc-700 dark:hover:bg-white/[0.07] dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <Inbox className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  {/* Group label */}
                  <p className="sticky top-0 bg-white/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 backdrop-blur dark:bg-zinc-900/80 dark:text-zinc-500">
                    {group.label}
                  </p>
                  {group.items.map((n) => {
                    const meta = EVENT_META[n.event] ?? defaultMeta;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                          "hover:bg-white/50 dark:hover:bg-white/[0.05]",
                          n.href && "cursor-pointer"
                        )}
                      >
                        {/* Icon bubble */}
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.08]">
                          <Icon className={cn("h-3.5 w-3.5", meta.colour)} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                              {relativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                            {n.body}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {n.unread && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
