"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, CONTENT_TYPES, HOOK_TYPES } from "@/lib/schedule-schema";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS, HOOK_TYPE_LABELS } from "@/lib/constants";
import type { Platform, ContentType, HookType } from "@/types/social";

interface IdeaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultPillarId?: string;
  editIdea?: {
    id: string;
    pillarId: string;
    title: string;
    notes: string;
    platform: string | null;
    contentType: string | null;
    hookType: string | null;
    targetHashtags: string[];
    keywords: string[];
  } | null;
}

export function IdeaFormModal({ open, onClose, onSaved, defaultPillarId, editIdea }: IdeaFormModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [contentType, setContentType] = useState<string>("");
  const [hookType, setHookType] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(editIdea?.title ?? "");
      setNotes(editIdea?.notes ?? "");
      setPlatform(editIdea?.platform ?? "");
      setContentType(editIdea?.contentType ?? "");
      setHookType(editIdea?.hookType ?? "");
      setTagsInput((editIdea?.targetHashtags ?? []).join(", "));
      setKeywordsInput((editIdea?.keywords ?? []).join(", "));
      setError("");
    }
  }, [open, editIdea]);

  function parseTags(raw: string): string[] {
    return raw.split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        pillarId: editIdea?.pillarId ?? defaultPillarId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        platform: platform || null,
        contentType: contentType || null,
        hookType: hookType || null,
        targetHashtags: parseTags(tagsInput),
        keywords: parseTags(keywordsInput),
      };
      const url = editIdea ? `/api/ideas/${editIdea.id}` : "/api/ideas";
      const method = editIdea ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ? JSON.stringify(data.error) : "Failed to save");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save idea");
    } finally {
      setSaving(false);
    }
  }

  const selectCls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto dark:border-zinc-700 dark:bg-zinc-900">
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>
          <Dialog.Title className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {editIdea ? "Edit Post Idea" : "New Post Idea"}
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Idea Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 5 mistakes people make when investing"
                className={selectCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Brief thoughts, angles, references…"
                className={`${selectCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectCls}>
                  <option value="">Any</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform]?.label ?? p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Content Type</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
                  <option value="">Any</option>
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct as ContentType]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Hook Type</label>
                <select value={hookType} onChange={(e) => setHookType(e.target.value)} className={selectCls}>
                  <option value="">Any</option>
                  {HOOK_TYPES.map((ht) => (
                    <option key={ht} value={ht}>{HOOK_TYPE_LABELS[ht as HookType]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Hashtags for matching</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="investing, finance, tips (comma separated)"
                className={selectCls}
              />
              <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">Used to find related existing posts</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Keywords for matching</label>
              <input
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="invest, portfolio, returns (comma separated)"
                className={selectCls}
              />
              <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">Searched in caption text of existing posts</p>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
