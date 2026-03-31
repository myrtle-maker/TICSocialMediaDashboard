"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#3b82f6", "#64748b",
];

interface PillarFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPillar?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  } | null;
}

export function PillarFormModal({ open, onClose, onSaved, editPillar }: PillarFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editPillar?.name ?? "");
      setDescription(editPillar?.description ?? "");
      setColor(editPillar?.color ?? "#6366f1");
      setError("");
      setConfirmDelete(false);
    }
  }, [open, editPillar]);

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editPillar ? `/api/pillars/${editPillar.id}` : "/api/pillars";
      const method = editPillar ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ? JSON.stringify(data.error) : "Failed to save");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save pillar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editPillar) return;
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    setSaving(true);
    try {
      await fetch(`/api/pillars/${editPillar.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch {
      setError("Failed to delete pillar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>
          <Dialog.Title className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {editPillar ? "Edit Content Pillar" : "New Content Pillar"}
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Education, Behind the Scenes"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What kind of content lives under this pillar?"
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Colour</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `3px solid ${c}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 rounded-full cursor-pointer border-0"
                  title="Custom colour"
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-5 flex items-center justify-between">
            {editPillar ? (
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={saving} className="text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? "Confirm delete" : "Delete pillar"}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
