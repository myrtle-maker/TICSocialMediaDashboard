"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
  Loader2, BookOpen, Layers, Megaphone, Users, Palette,
  FileText, Settings2, Network, ExternalLink, Upload,
  FileType2, File as FileIcon, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentPillar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  guidelines: string;
  sortOrder: number;
  ideas: { id: string }[];
}

export interface GuideFile {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

interface StrategyGuide {
  id: string;
  title: string;
  category: string;
  content: string;
  files: GuideFile[];
  sortOrder: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GUIDE_CATEGORIES = [
  { id: "all",           label: "All",            icon: BookOpen,  color: "text-zinc-500" },
  { id: "brand-voice",   label: "Brand Voice",    icon: Megaphone, color: "text-purple-500" },
  { id: "audience",      label: "Audience",       icon: Users,     color: "text-blue-500" },
  { id: "visual-style",  label: "Visual Style",   icon: Palette,   color: "text-pink-500" },
  { id: "content-rules", label: "Content Rules",  icon: FileText,  color: "text-amber-500" },
  { id: "workflow",      label: "Workflow",       icon: Settings2, color: "text-green-500" },
  { id: "general",       label: "General",        icon: BookOpen,  color: "text-zinc-400" },
] as const;

type CategoryId = (typeof GUIDE_CATEGORIES)[number]["id"];

const CATEGORY_BADGE: Record<string, string> = {
  "brand-voice":   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "audience":      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "visual-style":  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "content-rules": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "workflow":      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "general":       "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const PILLAR_COLORS = [
  "#6366f1","#ec4899","#10b981","#f59e0b",
  "#3b82f6","#8b5cf6","#ef4444","#06b6d4",
];

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file,
  guideId,
  onDelete,
}: {
  file: GuideFile;
  guideId: string;
  onDelete: (id: string) => void;
}) {
  const isPdf = file.contentType === "application/pdf" || file.name.endsWith(".pdf");
  const downloadHref = `/api/strategy/guides/${guideId}/files/${file.id}/download`;

  return (
    <div className="group flex items-center gap-2.5 rounded-lg border border-white/60 bg-white/40 px-3 py-2 dark:border-white/[0.06] dark:bg-white/[0.04]">
      {isPdf ? (
        <FileType2 className="h-4 w-4 shrink-0 text-red-500" />
      ) : (
        <FileIcon className="h-4 w-4 shrink-0 text-blue-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{file.name}</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatBytes(file.size)}</p>
      </div>
      <a
        href={downloadHref}
        className="shrink-0 rounded p-1 text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
        title="Download"
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
      <button
        onClick={() => onDelete(file.id)}
        className="shrink-0 rounded p-1 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
        title="Remove file"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pillar card (inline edit)
// ---------------------------------------------------------------------------

function PillarCard({
  pillar,
  onUpdated,
  onDeleted,
}: {
  pillar: ContentPillar;
  onUpdated: (p: ContentPillar) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pillar.name);
  const [description, setDescription] = useState(pillar.description ?? "");
  const [guidelines, setGuidelines] = useState(pillar.guidelines ?? "");
  const [color, setColor] = useState(pillar.color);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pillars/${pillar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || pillar.name, description: description || undefined, color, guidelines }),
      });
      const data = await res.json();
      if (data.pillar) {
        onUpdated(data.pillar);
        setEditing(false);
        toast.success("Pillar saved");
      } else {
        toast.error("Failed to save pillar");
      }
    } catch {
      toast.error("Failed to save pillar");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/pillars/${pillar.id}`, { method: "DELETE" });
      onDeleted(pillar.id);
      toast.success("Pillar deleted");
    } catch {
      toast.error("Failed to delete pillar");
    }
  };

  const hasGuidelines = (pillar.guidelines ?? "").trim().length > 0;

  return (
    <div className="rounded-xl border glass-card overflow-hidden">
      {/* Color strip */}
      <div className="h-1.5" style={{ backgroundColor: pillar.color }} />

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Pillar name…"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this pillar about? Who does it serve?"
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            />
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={4}
              placeholder="Execution guidelines — tone, formats, what to avoid, example hooks…"
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Colour:</span>
              {PILLAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white ring-offset-1 dark:ring-offset-zinc-900" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(pillar.name); setDescription(pillar.description ?? ""); setGuidelines(pillar.guidelines ?? ""); setColor(pillar.color); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{pillar.name}</h3>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setEditing(true)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDelete} className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">Yes</button>
                    <button onClick={() => setConfirmDelete(false)} className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {pillar.description && (
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{pillar.description}</p>
            )}

            <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pillar.color }} />
                {pillar.ideas.length} idea{pillar.ideas.length !== 1 ? "s" : ""}
              </span>
              <Link
                href="/mindmap"
                className="flex items-center gap-0.5 text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
              >
                <Network className="h-3 w-3" /> View in mindmap
                <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
              </Link>
            </div>

            {hasGuidelines && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex w-full items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  <span>Execution guidelines</span>
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {expanded && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {pillar.guidelines}
                  </p>
                )}
              </div>
            )}

            {!hasGuidelines && (
              <button
                onClick={() => setEditing(true)}
                className="mt-1 text-xs text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
              >
                + Add execution guidelines
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guide card (inline edit)
// ---------------------------------------------------------------------------

function GuideCard({
  guide,
  onUpdated,
  onDeleted,
}: {
  guide: StrategyGuide;
  onUpdated: (g: StrategyGuide) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(guide.title);
  const [category, setCategory] = useState(guide.category);
  const [content, setContent] = useState(guide.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [files, setFiles] = useState<GuideFile[]>(guide.files ?? []);
  const [uploading, setUploading] = useState<string[]>([]); // filenames being uploaded
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const catConfig = GUIDE_CATEGORIES.find((c) => c.id === guide.category) ?? GUIDE_CATEGORIES[GUIDE_CATEGORIES.length - 1];
  const CategoryIcon = catConfig.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/strategy/guides/${guide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || guide.title, category, content }),
      });
      const data = await res.json();
      if (data.guide) {
        onUpdated({ ...data.guide, files });
        setEditing(false);
        toast.success("Guide saved");
      } else {
        toast.error("Failed to save guide");
      }
    } catch {
      toast.error("Failed to save guide");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/strategy/guides/${guide.id}`, { method: "DELETE" });
      onDeleted(guide.id);
      toast.success("Guide deleted");
    } catch {
      toast.error("Failed to delete guide");
    }
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const toUpload = Array.from(fileList);

    for (const file of toUpload) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
      if (![".pdf", ".md", ".markdown"].includes(ext)) {
        toast.error(`${file.name} — only .pdf and .md files are allowed`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} — file must be under 10 MB`);
        continue;
      }

      setUploading((prev) => [...prev, file.name]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/strategy/guides/${guide.id}/files`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (data.file) {
          setFiles((prev) => [...prev, data.file]);
          toast.success(`${file.name} uploaded`);
        } else {
          toast.error(data.error ?? `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading((prev) => prev.filter((n) => n !== file.name));
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/strategy/guides/${guide.id}/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        toast.success("File removed");
      } else {
        toast.error("Failed to remove file");
      }
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const preview = guide.content.split("\n").filter(Boolean).slice(0, 2).join(" · ");

  return (
    <div className="rounded-xl border glass-card">
      <div className="p-4">
        {editing ? (
          /* ── Edit mode ── */
          <div className="space-y-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Guide title…"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {GUIDE_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Write your guide content here. Use plain text or markdown-style formatting with bullet points, headings (##), etc."
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(guide.title); setCategory(guide.category); setContent(guide.content); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            {/* Header row */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <CategoryIcon className={`mt-0.5 h-4 w-4 shrink-0 ${catConfig.color}`} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{guide.title}</h3>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[guide.category] ?? CATEGORY_BADGE.general}`}>
                    {catConfig.label}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setEditing(true)} className="rounded p-1 text-zinc-400 hover:bg-white/50 hover:text-zinc-600 dark:hover:bg-white/[0.08] dark:hover:text-zinc-300" title="Edit guide">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDelete} className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">Yes</button>
                    <button onClick={() => setConfirmDelete(false)} className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="rounded p-1 text-zinc-400 hover:bg-white/50 hover:text-red-500 dark:hover:bg-white/[0.08] dark:hover:text-red-400" title="Delete guide">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Written content */}
            {guide.content ? (
              <>
                {!expanded && preview && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{preview}</p>
                )}
                {expanded && (
                  <div className="mt-3 rounded-lg bg-white/40 dark:bg-white/[0.04] p-3">
                    <pre className="whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                      {guide.content}
                    </pre>
                  </div>
                )}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  {expanded ? <><ChevronUp className="h-3 w-3" /> Collapse</> : <><ChevronDown className="h-3 w-3" /> Read notes</>}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="mt-1 text-xs text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                + Add notes
              </button>
            )}

            {/* ── Files section ─────────────────────────────────────── */}
            <div className="mt-4 border-t border-white/60 pt-3 dark:border-white/[0.06]">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <FileText className="h-3.5 w-3.5" />
                  Files
                  {files.length > 0 && (
                    <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-400">
                      {files.length}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-white/50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-300"
                >
                  <Upload className="h-3 w-3" /> Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.md,.markdown"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </div>

              {/* Drop zone (shown when no files and no uploads in progress) */}
              {files.length === 0 && uploading.length === 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "border-white/50 hover:border-indigo-300 hover:bg-white/30 dark:border-white/[0.08] dark:hover:border-indigo-700 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Upload className="mx-auto mb-1.5 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Drag &amp; drop or <span className="text-indigo-500 dark:text-indigo-400">browse</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">.pdf and .md · max 10 MB</p>
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((f) => (
                    <FileRow key={f.id} file={f} guideId={guide.id} onDelete={handleDeleteFile} />
                  ))}
                </div>
              )}

              {/* Upload-in-progress indicators */}
              {uploading.length > 0 && (
                <div className="mt-1.5 space-y-1.5">
                  {uploading.map((name) => (
                    <div key={name} className="flex items-center gap-2.5 rounded-lg border border-white/60 bg-white/40 px-3 py-2 dark:border-white/[0.06] dark:bg-white/[0.04]">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{name}</p>
                      <span className="ml-auto text-[10px] text-zinc-400">Uploading…</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add more button when files exist */}
              {files.length > 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
                  className={`mt-1.5 cursor-pointer rounded-lg border border-dashed px-3 py-2 text-center transition-colors ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "border-white/50 hover:border-indigo-300 dark:border-white/[0.08] dark:hover:border-indigo-700"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    + drag &amp; drop or click to add another file
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New guide modal
// ---------------------------------------------------------------------------

function NewGuideModal({ onCreated, onClose }: { onCreated: (g: StrategyGuide) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("brand-voice");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, content }),
      });
      const data = await res.json();
      if (data.guide) {
        onCreated({ ...data.guide, files: Array.isArray(data.guide.files) ? data.guide.files : [] });
        onClose();
        toast.success("Guide created");
      } else {
        const msg = data.error ? JSON.stringify(data.error) : "Failed to create guide";
        setError(msg);
        toast.error("Failed to create guide");
      }
    } catch (err) {
      const msg = String(err);
      setError(msg);
      toast.error("Failed to create guide");
    }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border glass-elevated p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">New Reference Guide</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Guide title…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {GUIDE_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write your guide content here…"
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono"
          />
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Guide
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New pillar modal
// ---------------------------------------------------------------------------

function NewPillarModal({ onCreated, onClose }: { onCreated: (p: ContentPillar) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PILLAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color }),
      });
      const data = await res.json();
      if (data.pillar) { onCreated({ ...data.pillar, ideas: [] }); onClose(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border glass-elevated p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">New Content Pillar</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Education, Behind the Scenes, Product…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this pillar about? Who does it serve?"
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Colour:</span>
            {PILLAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white ring-offset-1 dark:ring-offset-zinc-900" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Pillar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StrategyPage() {
  const [tab, setTab] = useState<"pillars" | "guides">("pillars");
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [guides, setGuides] = useState<StrategyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryId>("all");
  const [showNewGuide, setShowNewGuide] = useState(false);
  const [showNewPillar, setShowNewPillar] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/pillars").then((r) => r.json()),
      fetch("/api/strategy/guides").then((r) => r.json()),
    ]).then(([pd, gd]) => {
      setPillars(pd.pillars ?? []);
      // Normalise files field: Prisma Json may arrive as null on existing rows
      setGuides((gd.guides ?? []).map((g: StrategyGuide) => ({ ...g, files: Array.isArray(g.files) ? g.files : [] })));
    }).finally(() => setLoading(false));
  }, []);

  const filteredGuides = categoryFilter === "all"
    ? guides
    : guides.filter((g) => g.category === categoryFilter);

  const totalIdeas = pillars.reduce((s, p) => s + p.ideas.length, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Strategy</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Core pillars and reference guides to keep all content aligned to your brand.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "pillars" && (
            <Button onClick={() => setShowNewPillar(true)}>
              <Plus className="h-4 w-4" /> New Pillar
            </Button>
          )}
          {tab === "guides" && (
            <Button onClick={() => setShowNewGuide(true)}>
              <Plus className="h-4 w-4" /> New Guide
            </Button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border glass-card p-4">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-7 w-10" />
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { label: "Content Pillars", value: pillars.length, icon: Layers, color: "text-indigo-500" },
              { label: "Ideas Across Pillars", value: totalIdeas, icon: Network, color: "text-purple-500" },
              { label: "Reference Guides", value: guides.length, icon: BookOpen, color: "text-blue-500" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border glass-card p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                    {s.label}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {(["pillars", "guides"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {t === "pillars" ? "Content Pillars" : "Reference Guides"}
            <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800">
              {t === "pillars" ? pillars.length : guides.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border glass-card">
              <Skeleton className="h-1.5 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "pillars" ? (
        /* ── Pillars ── */
        <>
          {pillars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <Layers className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No pillars yet</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Define 3–7 core content themes that anchor everything you create.
              </p>
              <Button className="mt-4" onClick={() => setShowNewPillar(true)}>
                <Plus className="h-4 w-4" /> Create your first pillar
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.map((p) => (
                <PillarCard
                  key={p.id}
                  pillar={p}
                  onUpdated={(updated) => setPillars((prev) => prev.map((x) => x.id === updated.id ? { ...updated, ideas: x.ideas } : x))}
                  onDeleted={(id) => setPillars((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Reference Guides ── */
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {GUIDE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = cat.id === "all" ? guides.length : guides.filter((g) => g.category === cat.id).length;
              if (count === 0 && cat.id !== "all") return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as CategoryId)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                  <span className="rounded-full bg-zinc-100 px-1 py-0.5 text-[10px] dark:bg-zinc-800 dark:text-zinc-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredGuides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {categoryFilter === "all" ? "No guides yet" : `No ${GUIDE_CATEGORIES.find((c) => c.id === categoryFilter)?.label} guides yet`}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Add style guides, audience profiles, tone of voice docs, and more.
              </p>
              <Button className="mt-4" onClick={() => setShowNewGuide(true)}>
                <Plus className="h-4 w-4" /> Create a guide
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGuides.map((g) => (
                <GuideCard
                  key={g.id}
                  guide={g}
                  onUpdated={(updated) => setGuides((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
                  onDeleted={(id) => setGuides((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showNewGuide && (
        <NewGuideModal
          onCreated={(g) => setGuides((prev) => [...prev, g])}
          onClose={() => setShowNewGuide(false)}
        />
      )}
      {showNewPillar && (
        <NewPillarModal
          onCreated={(p) => setPillars((prev) => [...prev, p])}
          onClose={() => setShowNewPillar(false)}
        />
      )}
    </div>
  );
}
