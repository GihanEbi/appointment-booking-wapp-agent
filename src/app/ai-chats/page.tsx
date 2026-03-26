"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { MessageCircle, Bot, User, Loader2, Search, Send, AlertCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

interface Session {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: "active" | "resolved" | "archived";
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  created_at: string;
}

export default function AIChatsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: sessions } = useSWR<Session[]>("/api/sessions", fetcher, {
    refreshInterval: 10000,
    onSuccess(data) {
      if (!selectedId && data && data.length > 0) {
        setSelectedId(data[0].id);
      }
    },
  });

  const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(
    selectedId ? `/api/sessions/${selectedId}/messages` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear send error when switching sessions
  useEffect(() => {
    setSendError(null);
    setDraft("");
  }, [selectedId]);

  const sendMessage = useCallback(async () => {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    setSendError(null);
    const text = draft.trim();
    setDraft("");

    const res = await fetch(`/api/sessions/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const json = await res.json();
    if (!json.ok) {
      setSendError(json.error ?? "Failed to send message");
    }

    setSending(false);
    mutateMessages();
    inputRef.current?.focus();
  }, [draft, selectedId, sending, mutateMessages]);

  const filteredSessions = (sessions ?? []).filter((s) =>
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_phone.includes(search)
  );

  const activeSession = sessions?.find((s) => s.id === selectedId);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
            AI Interaction Monitor
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
            Monitor and manage all AI-handled WhatsApp conversations in real time.
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-2xl overflow-hidden"
          style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
        >
          {/* Conversation list */}
          <div
            className="overflow-y-auto flex flex-col"
            style={{
              background: "var(--surface-container-lowest)",
              boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
              borderRadius: "1.5rem",
            }}
          >
            {/* Search */}
            <div className="p-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--on-surface-variant)" }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mt-2 px-1" style={{ color: "var(--on-surface-variant)" }}>
                {filteredSessions.length} Conversations
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!sessions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-xs px-3" style={{ color: "var(--on-surface-variant)" }}>
                  {sessions.length === 0
                    ? "No conversations yet. WhatsApp conversations will appear here."
                    : "No results found."}
                </div>
              ) : (
                filteredSessions.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: conv.id === selectedId ? "var(--surface-container-low)" : "transparent",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                        color: "var(--on-primary)",
                      }}
                    >
                      {initials(conv.customer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                          {conv.customer_name}
                        </p>
                        <span className="text-xs flex-shrink-0 ml-1" style={{ color: "var(--on-surface-variant)" }}>
                          {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                        {conv.last_message ?? conv.customer_phone}
                      </p>
                    </div>
                    {conv.status === "active" && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: "var(--primary)" }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat window */}
          <div
            className="lg:col-span-2 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
          >
            {!activeSession ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "var(--on-surface-variant)" }}>
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--outline-variant)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                      color: "var(--on-primary)",
                    }}
                  >
                    {initials(activeSession.customer_name)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                      {activeSession.customer_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                      {activeSession.customer_phone} · AI Handling
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                  >
                    <Bot className="w-3 h-3" />
                    AI Active
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!messages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      No messages yet.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: msg.role === "ai"
                              ? "linear-gradient(135deg, var(--primary), var(--primary-container))"
                              : "var(--surface-container-high)",
                          }}
                        >
                          {msg.role === "ai"
                            ? <Bot className="w-4 h-4 text-white" />
                            : <User className="w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                          }
                        </div>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={{
                            background: msg.role === "user"
                              ? "var(--secondary-container)"
                              : "var(--surface-container-low)",
                            color: "var(--on-surface)",
                          }}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>
                            {new Date(msg.created_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Manual message input */}
                <div
                  className="flex-shrink-0 px-4 pb-4 pt-2 space-y-2"
                  style={{ borderTop: "1px solid var(--outline-variant)" }}
                >
                  {sendError && (
                    <div
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                      style={{ background: "#f443361a", color: "#f44336" }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {sendError}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Send a manual message to the customer…"
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: "var(--surface-container-low)",
                        color: "var(--on-surface)",
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      className="btn-primary w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl disabled:opacity-50"
                    >
                      {sending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <p className="text-xs px-1" style={{ color: "var(--on-surface-variant)" }}>
                    <Bot className="w-3 h-3 inline mr-1" style={{ color: "var(--primary)" }} />
                    AI auto-replies are still active. Manual messages are sent as the agent.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
