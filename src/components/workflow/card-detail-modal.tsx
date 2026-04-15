"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Tag, Calendar, User, Monitor, FileVideo, Loader2, CalendarClock, CheckCircle2, Link2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import { toast } from "sonner";

export interface CardLink {
  url: string;
  label: string;
}

export interface BoardCardData {
  id: string;
  listId: string;
  title: string;
  description: string;
  platform: string | null;
  contentType: string | null;
  priority: string;
  labels: string[];
  links: CardLink[];
  dueDate: string | null;
  assignee: string | null;
  sortOrder: number;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  high:   { label: "High",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const PLATFORMS = ["", "tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"];
const CONTENT_TYPES = ["", "video", "short", "reel", "carousel", "image", "story", "live", "text"];

// Valid values accepted by /api/schedule
const SCHEDULE_PLATFORMS = new Set(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"]);
const SCHEDULE_CONTENT_TYPES = new Set(["video", "image", "carousel", "text", "reel", "short", "story", "live"]);

interface Props {
  card: BoardCardData;
  listName: string;
  onClose: () => void;
  onUpdated: (card: BoardCardData) => void;
  onDeleted: (id: string) => void;
}

export function CardDetailModal({ card, listName, onClose, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [platform, setPlatform] = useState(card.platform ?? "");
  const [contentType, setContentType] = useState(card.contentType ?? "");
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [assignee, setAssignee] = useState(card.assignee ?? "");
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<string[]>(card.labels ?? []);
  const [links, setLinks] = useState<CardLink[]>(card.links ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  useEffect(() => { setDirty(true); }, [title, description, platform, contentType, priority, dueDate, assignee, labels, links]);
  useEffect(() => { setDirty(false); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/board-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || card.title,
          description,
          platform: platform || null,
          contentType: contentType || null,
          priority,
          labels,
          links: links.filter((l) => l.url.trim()),
          dueDate: dueDate || null,
          assignee: assignee || null,
        }),
      });
      const data = await res.json();
      if (data.card) {
        onUpdated({ ...data.card, links: data.card.links ?? [] });
        setDirty(false);
        toast.success("Card saved");
      } else {
        toast.error("Failed to save card");
      }
    } catch {
      toast.error("Failed to save card");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await fetch(`/api/board-cards/${card.id}`, { method: "DELETE" });
    onDeleted(card.id);
    onClose();
  };

  const canSchedule =
    platform && SCHEDULE_PLATFORMS.has(platform) &&
    contentType && SCHEDULE_CONTENT_TYPES.has(contentType) &&
    dueDate;

  const scheduleTooltip = !canSchedule
    ? !platform || !SCHEDULE_PLATFORMS.has(platform)
      ? "Set a platform to enable scheduling"
      : !contentType || !SCHEDULE_CONTENT_TYPES.has(contentType)
      ? "Set a content type to enable scheduling"
      : "Set a due date to use as the scheduled time"
    : null;

  const handleSendToSchedule = async () => {
    if (!canSchedule) return;
    setScheduling(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          scheduledAt: new Date(dueDate).toISOString(),
          notes: [title, description].filter(Boolean).join("\n\n") || undefined,
        }),
      });
      if (res.ok) {
        setScheduled(true);
        toast.success("Added to Schedule Planner");
      } else {
        toast.error("Failed to schedule — check platform and content type");
      }
    } catch {
      toast.error("Failed to schedule");
    }
    finally { setScheduling(false); }
  };

  const addLabel = () => {
    const val = labelInput.trim();
    if (val && !labels.includes(val)) setLabels((prev) => [...prev, val]);
    setLabelInput("");
  };
  const removeLabel = (l: string) => setLabels((prev) => prev.filter((x) => x !== l));

  const addLink = () => setLinks((prev) => [...prev, { url: "", label: "" }]);
  const updateLink = (i: number, field: "url" | "label", value: string) =>
    setLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const isOverdue = dueDate && new Date(dueDate) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              {listName}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-base font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
              placeholder="Card title…"
            />
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Description / Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add script notes, brief, or any details…"
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Row: Platform + Content Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <Monitor className="h-3 w-3" /> Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Any platform</option>
                {PLATFORMS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform]?.label ?? p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <FileVideo className="h-3 w-3" /> Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 capitalize focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Any type</option>
                {CONTENT_TYPES.filter(Boolean).map((ct) => (
                  <option key={ct} value={ct} className="capitalize">{ct}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Priority + Due Date + Assignee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <Calendar className="h-3 w-3" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 ${
                  isOverdue
                    ? "border-red-400 text-red-600 dark:border-red-600 dark:text-red-400"
                    : "border-zinc-300 text-zinc-900 dark:border-zinc-600"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <User className="h-3 w-3" /> Assignee
              </label>
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <Tag className="h-3 w-3" /> Labels
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {l}
                  <button onClick={() => removeLabel(l)} className="text-indigo-400 hover:text-indigo-600">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
                placeholder="Add label, press Enter…"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <Button size="sm" variant="outline" onClick={addLabel} disabled={!labelInput.trim()}>Add</Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <Link2 className="h-3 w-3" /> Links
              </label>
              <button
                onClick={addLink}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <Plus className="h-3 w-3" /> Add link
              </button>
            </div>

            {links.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                No links yet — add reference videos, scripts, briefs, or any file URLs.
              </p>
            )}

            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-1 flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <input
                      value={link.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                      placeholder="Label (e.g. Script Doc, Reference Video)"
                      className="w-full bg-transparent text-xs font-medium text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-300"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        placeholder="https://…"
                        className="flex-1 bg-transparent text-xs text-zinc-500 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-400"
                      />
                      {link.url && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeLink(i)}
                    className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            {/* Send to Schedule */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Send to Schedule Planner</span>
              <div className="relative group/sched">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canSchedule || scheduling || scheduled}
                  onClick={handleSendToSchedule}
                  className={scheduled ? "border-green-500 text-green-600 dark:text-green-400" : ""}
                >
                  {scheduled ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Scheduled</>
                  ) : scheduling ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                  ) : (
                    <><CalendarClock className="h-3.5 w-3.5" /> Send to Schedule</>
                  )}
                </Button>
                {scheduleTooltip && (
                  <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden w-52 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] text-zinc-500 shadow-md group-hover/sched:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    {scheduleTooltip}
                  </div>
                )}
              </div>
            </div>

            {/* Delete / Save row */}
            <div className="flex items-center justify-between">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 dark:text-red-400">Delete this card?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete}>Yes, delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete card
                </button>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
