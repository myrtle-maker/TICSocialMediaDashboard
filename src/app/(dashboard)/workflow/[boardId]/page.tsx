"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Loader2, ArrowLeft, MoreHorizontal, Trash2, GripVertical, Calendar, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import { CardDetailModal, type BoardCardData } from "@/components/workflow/card-detail-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoardCard extends BoardCardData {}

interface BoardList {
  id: string;
  boardId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  cards: BoardCard[];
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  lists: BoardList[];
}

// ---------------------------------------------------------------------------
// Priority colours
// ---------------------------------------------------------------------------

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-zinc-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Individual card (draggable)
// ---------------------------------------------------------------------------

function KanbanCard({
  card,
  onClick,
}: {
  card: BoardCard;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative mb-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded p-0.5 text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600"
        aria-label="Drag card"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="pl-4 cursor-pointer" onClick={onClick}>
        {/* Priority dot + title */}
        <div className="mb-1.5 flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[card.priority] ?? "bg-zinc-400"}`} />
          <p className="text-sm font-medium text-zinc-900 leading-snug dark:text-zinc-100">{card.title}</p>
        </div>

        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {card.labels.slice(0, 3).map((l) => (
              <span key={l} className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {l}
              </span>
            ))}
            {card.labels.length > 3 && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">+{card.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500">
          {card.platform && (
            <span className="capitalize">{PLATFORM_CONFIG[card.platform as Platform]?.label ?? card.platform}</span>
          )}
          {card.dueDate && (
            <span className={`flex items-center gap-0.5 ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(card.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
          {card.assignee && (
            <span className="flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" />{card.assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay card (shown while dragging)
// ---------------------------------------------------------------------------

function DragCard({ card }: { card: BoardCard }) {
  return (
    <div className="mb-2 w-64 rotate-2 rounded-lg border border-zinc-300 bg-white p-3 shadow-2xl dark:border-zinc-600 dark:bg-zinc-800">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{card.title}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column (droppable + sortable cards)
// ---------------------------------------------------------------------------

function Column({
  list,
  onAddCard,
  onCardClick,
  onRenameList,
  onDeleteList,
}: {
  list: BoardList;
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (card: BoardCard) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef: setDropRef } = useDroppable({ id: list.id });
  const cardIds = list.cards.map((c) => c.id);

  const submitCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle("");
    }
    setAddingCard(false);
  };

  const submitRename = () => {
    if (nameValue.trim() && nameValue.trim() !== list.name) {
      onRenameList(list.id, nameValue.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-100 dark:bg-zinc-800/60">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") { setNameValue(list.name); setEditingName(false); } }}
            className="flex-1 rounded bg-white px-2 py-0.5 text-sm font-semibold text-zinc-900 focus:outline-none dark:bg-zinc-700 dark:text-zinc-100"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {list.name}
          </button>
        )}
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {list.cards.length}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 z-20 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  onClick={() => { onDeleteList(list.id); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete column
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div ref={setDropRef} className="min-h-8 flex-1 overflow-y-auto px-2 pb-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {list.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="px-2 pb-2">
        {addingCard ? (
          <div className="rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitCard(); } if (e.key === "Escape") setAddingCard(false); }}
              placeholder="Card title…"
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={submitCard} className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
                Add card
              </button>
              <button onClick={() => setAddingCard(false)} className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board page
// ---------------------------------------------------------------------------

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ card: BoardCard; listName: string } | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      const data = await res.json();
      if (data.board) {
        setBoard(data.board);
        setLists(data.board.lists);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const findListByCardId = (cardId: string) =>
    lists.find((l) => l.cards.some((c) => c.id === cardId));

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const list = findListByCardId(id);
    setActiveCard(list?.cards.find((c) => c.id === id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeList = findListByCardId(activeId);
    // over could be a card or a list
    const overList = findListByCardId(overId) ?? lists.find((l) => l.id === overId);

    if (!activeList || !overList || activeList.id === overList.id) return;

    // Moving card to a different list visually (optimistic)
    setLists((prev) => {
      const card = activeList.cards.find((c) => c.id === activeId)!;
      const overCardIndex = overList.cards.findIndex((c) => c.id === overId);
      const insertIndex = overCardIndex >= 0 ? overCardIndex : overList.cards.length;

      return prev.map((l) => {
        if (l.id === activeList.id) return { ...l, cards: l.cards.filter((c) => c.id !== activeId) };
        if (l.id === overList.id) {
          const newCards = [...l.cards];
          newCards.splice(insertIndex, 0, { ...card, listId: overList.id });
          return { ...l, cards: newCards };
        }
        return l;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeList = findListByCardId(activeId);
    if (!activeList) return;

    const overList = findListByCardId(overId) ?? lists.find((l) => l.id === overId);
    if (!overList) return;

    if (activeList.id === overList.id) {
      // Same list — reorder
      const oldIndex = activeList.cards.findIndex((c) => c.id === activeId);
      const newIndex = activeList.cards.findIndex((c) => c.id === overId);
      if (oldIndex === newIndex) return;

      setLists((prev) =>
        prev.map((l) =>
          l.id === activeList.id ? { ...l, cards: arrayMove(l.cards, oldIndex, newIndex) } : l
        )
      );

      await fetch(`/api/board-cards/${activeId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toListId: activeList.id, newIndex }),
      });
    } else {
      // Cross-list — find new index in destination
      const newIndex = overList.cards.findIndex((c) => c.id === activeId);
      const insertIndex = newIndex >= 0 ? newIndex : overList.cards.length;

      await fetch(`/api/board-cards/${activeId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toListId: overList.id, newIndex: insertIndex }),
      });
    }
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleAddCard = async (listId: string, title: string) => {
    const res = await fetch("/api/board-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, title }),
    });
    const data = await res.json();
    if (data.card) {
      setLists((prev) =>
        prev.map((l) => l.id === listId ? { ...l, cards: [...l.cards, data.card] } : l)
      );
    }
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    const res = await fetch("/api/board-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, name: newColName.trim() }),
    });
    const data = await res.json();
    if (data.list) {
      setLists((prev) => [...prev, { ...data.list, cards: [] }]);
      setNewColName("");
      setAddingColumn(false);
    }
  };

  const handleRenameList = async (id: string, name: string) => {
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, name } : l));
    await fetch(`/api/board-lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  const handleDeleteList = async (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/board-lists/${id}`, { method: "DELETE" });
  };

  const handleCardUpdated = (updated: BoardCard) => {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        cards: l.cards.map((c) => c.id === updated.id ? { ...c, ...updated } : c),
      }))
    );
    if (selectedCard && selectedCard.card.id === updated.id) {
      setSelectedCard({ card: { ...selectedCard.card, ...updated }, listName: selectedCard.listName });
    }
  };

  const handleCardDeleted = (id: string) => {
    setLists((prev) =>
      prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== id) }))
    );
    setSelectedCard(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Board not found.</p>
        <Link href="/workflow"><Button variant="outline">Back to boards</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Board header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/workflow" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-4 w-1 rounded-full" style={{ backgroundColor: board.color }} />
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{board.name}</h2>
          {board.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{board.description}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <span>{lists.length} column{lists.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{lists.reduce((s, l) => s + l.cards.length, 0)} card{lists.reduce((s, l) => s + l.cards.length, 0) !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Kanban board — horizontally scrollable */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
            {lists.map((list) => (
              <Column
                key={list.id}
                list={list}
                onAddCard={handleAddCard}
                onCardClick={(card) => setSelectedCard({ card, listName: list.name })}
                onRenameList={handleRenameList}
                onDeleteList={handleDeleteList}
              />
            ))}

            {/* Add column */}
            <div className="w-72 shrink-0">
              {addingColumn ? (
                <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") setAddingColumn(false); }}
                    placeholder="Column name…"
                    className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={handleAddColumn} className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
                      Add column
                    </button>
                    <button onClick={() => setAddingColumn(false)} className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                >
                  <Plus className="h-4 w-4" /> Add column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard ? <DragCard card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          listName={selectedCard.listName}
          onClose={() => setSelectedCard(null)}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </div>
  );
}
