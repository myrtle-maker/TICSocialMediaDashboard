"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  avatarColor: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string; avatarColor: string };
}

interface ConversationSummary {
  peer: User | null;
  latest: { body: string; createdAt: string; senderId: string } | null;
  unread: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ user, size = "md" }: { user: { name: string; avatarColor: string }; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", dim)}
      style={{ backgroundColor: user.avatarColor }}
    >
      {initials(user.name)}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current user
  const { data: meData } = useSWR<{ user: User }>("/api/auth/me", fetcher);
  const me = meData?.user;

  // All users (for sidebar list)
  const { data: usersData } = useSWR<{ users: User[] }>("/api/users", fetcher);
  const users = (usersData?.users ?? []).filter((u) => u.id !== me?.id);

  // Unread counts per sender (poll every 5s)
  const { data: unreadData, mutate: mutateUnread } = useSWR<{ count: number }>(
    "/api/dm/unread",
    fetcher,
    { refreshInterval: 5000 }
  );

  // Thread with selected user (poll every 5s when a conversation is open)
  const { data: threadData, mutate: mutateThread } = useSWR<{ messages: Message[] }>(
    selectedUserId ? `/api/dm?with=${selectedUserId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
  const messages = threadData?.messages ?? [];

  // Inbox summaries (poll every 10s)
  const { data: inboxData, mutate: mutateInbox } = useSWR<{ conversations: ConversationSummary[] }>(
    "/api/dm",
    fetcher,
    { refreshInterval: 10000 }
  );
  const conversations = inboxData?.conversations ?? [];

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Merge users + inbox summaries for the user list
  const unreadBySender: Record<string, number> = {};
  conversations.forEach((c) => {
    if (c.peer) unreadBySender[c.peer.id] = c.unread;
  });

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedUserId || sending) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    try {
      await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedUserId, body }),
      });
      await Promise.all([mutateThread(), mutateInbox(), mutateUnread()]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, selectedUserId, sending, mutateThread, mutateInbox, mutateUnread]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-white/60 glass-card dark:border-white/[0.06]">
      {/* ------------------------------------------------------------------ */}
      {/* Left: user / conversation list                                      */}
      {/* ------------------------------------------------------------------ */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/60 dark:border-white/[0.06]">
        <div className="border-b border-white/60 px-4 py-3 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Team Messages</h2>
          {typeof unreadData?.count === "number" && unreadData.count > 0 && (
            <p className="text-[11px] text-indigo-500">
              {unreadData.count} unread
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {users.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              No other team members yet
            </p>
          )}
          {users.map((user) => {
            const unread = unreadBySender[user.id] ?? 0;
            const isActive = selectedUserId === user.id;
            const conv = conversations.find((c) => c.peer?.id === user.id);

            return (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-white/60 dark:bg-white/10"
                    : "hover:bg-white/40 dark:hover:bg-white/[0.06]"
                )}
              >
                <div className="relative">
                  <Avatar user={user} size="sm" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {user.name}
                  </p>
                  {conv?.latest && (
                    <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                      {conv.latest.senderId === me?.id ? "You: " : ""}
                      {conv.latest.body}
                    </p>
                  )}
                </div>
                {conv?.latest && (
                  <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                    {formatTime(conv.latest.createdAt)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Right: conversation view                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selectedUser ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Select a team member to start a conversation
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Messages are only visible to participants
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/60 px-5 py-3 dark:border-white/[0.06]">
              <Avatar user={selectedUser} />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedUser.name}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No messages yet — say hello!
                  </p>
                )}
                {messages.map((msg) => {
                  const isMe = msg.senderId === me?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                    >
                      {!isMe && <Avatar user={msg.sender} size="sm" />}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          isMe
                            ? "rounded-br-sm bg-indigo-500 text-white"
                            : "rounded-bl-sm bg-white/70 text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-200"
                        )}
                      >
                        {msg.body}
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/60 px-4 py-3 dark:border-white/[0.06]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedUser.name}…`}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500"
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
