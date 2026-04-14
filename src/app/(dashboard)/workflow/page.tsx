"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, Trash2, Layout, Video, CalendarDays, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BoardSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  lists: { _count: { cards: number } }[];
  _count: { lists: number };
}

const BOARD_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

const TEMPLATES = [
  { id: "blank", label: "Blank Board", icon: Layout, description: "Start with an empty board" },
  { id: "video-production", label: "Video Production", icon: Video, description: "Ideas → Scripting → Filming → Editing → Review → Published" },
  { id: "content-calendar", label: "Content Calendar", icon: CalendarDays, description: "Planned → In Progress → Scheduled → Live" },
  { id: "campaign-planning", label: "Campaign Planning", icon: Megaphone, description: "Brief → Research → Creative → Approval → Live" },
];

export default function WorkflowPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(BOARD_COLORS[0]);
  const [newTemplate, setNewTemplate] = useState("video-production");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadBoards = async () => {
    try {
      const res = await fetch("/api/boards");
      const data = await res.json();
      setBoards(data.boards ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBoards(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || undefined, color: newColor, template: newTemplate }),
      });
      setNewName(""); setNewDescription(""); setNewColor(BOARD_COLORS[0]); setNewTemplate("video-production");
      setShowCreate(false);
      await loadBoards();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await loadBoards();
  };

  const totalCards = (board: BoardSummary) => board.lists.reduce((s, l) => s + l._count.cards, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Workflow Boards</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kanban boards for tracking video scripts, content production, and campaign workflows.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Board
        </Button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Create New Board</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Board name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. TikTok Scripts, YouTube Production…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Description (optional)</label>
                <input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this board for?"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Template</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setNewTemplate(t.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          newTemplate === t.id
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                        }`}
                      >
                        <Icon className="mb-1 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.label}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">{t.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Colour</label>
                <div className="flex gap-2">
                  {BOARD_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${newColor === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-200 dark:ring-offset-zinc-700" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Board
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <Layout className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No boards yet</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create your first board to start tracking video scripts and content production.
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create your first board
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div key={board.id} className="group relative">
              <Link href={`/workflow/${board.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <div className="h-2 rounded-t-xl" style={{ backgroundColor: board.color }} />
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{board.name}</h3>
                    </div>
                    {board.description && (
                      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {board.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {board._count.lists} column{board._count.lists !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {totalCards(board)} card{totalCards(board) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Delete button — visible on hover */}
              <button
                onClick={(e) => { e.preventDefault(); setDeleteConfirm(board.id); }}
                className="absolute right-3 top-5 hidden rounded p-1 text-white/80 hover:text-white group-hover:block"
                title="Delete board"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Delete board?</h3>
            <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete the board and all its cards. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
