"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, CONTENT_TYPES, HOOK_TYPES } from "@/lib/schedule-schema";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS, HOOK_TYPE_LABELS } from "@/lib/constants";
import type { Platform, ContentType, HookType } from "@/types/social";

interface PromoteIdeaModalProps {
  open: boolean;
  onClose: () => void;
  onPromoted: () => void;
  idea: {
    id: string;
    title: string;
    notes: string;
    platform: string | null;
    contentType: string | null;
    hookType: string | null;
  } | null;
}

export function PromoteIdeaModal({ open, onClose, onPromoted, idea }: PromoteIdeaModalProps) {
  const [platform, setPlatform] = useState<string>("tiktok");
  const [contentType, setContentType] = useState<string>("video");
  const [hookType, setHookType] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && idea) {
      setPlatform(idea.platform ?? "tiktok");
      setContentType(idea.contentType ?? "video");
      setHookType(idea.hookType ?? "");
      setCaption(idea.title);
      setNotes(idea.notes ?? "");
      // Default to tomorrow at 10am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setScheduledAt(tomorrow.toISOString().slice(0, 16));
      setError("");
    }
  }, [open, idea]);

  async function handlePromote() {
    if (!idea) return;
    if (!scheduledAt) { setError("Scheduled date is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/ideas/${idea.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          hookType: hookType || undefined,
          caption: caption.trim() || undefined,
          notes: notes.trim() || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ? JSON.stringify(data.error) : "Failed to promote");
        return;
      }
      onPromoted();
      onClose();
    } catch {
      setError("Failed to promote idea");
    } finally {
      setSaving(false);
    }
  }

  const selectCls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border glass-elevated p-6 shadow-xl">
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>
          <Dialog.Title className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
            Schedule Post
          </Dialog.Title>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Promote &ldquo;{idea?.title}&rdquo; to the Schedule Planner
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Platform *</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectCls}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform]?.label ?? p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Content Type *</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct as ContentType]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Hook Type</label>
              <select value={hookType} onChange={(e) => setHookType(e.target.value)} className={selectCls}>
                <option value="">None</option>
                {HOOK_TYPES.map((ht) => (
                  <option key={ht} value={ht}>{HOOK_TYPE_LABELS[ht as HookType]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Caption / Draft</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className={`${selectCls} resize-none`}
                placeholder="Write your caption here…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Production notes…" className={selectCls} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={selectCls}
              />
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handlePromote} disabled={saving}>
              <ArrowUpRight className="h-4 w-4" />
              {saving ? "Scheduling…" : "Add to Schedule"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
