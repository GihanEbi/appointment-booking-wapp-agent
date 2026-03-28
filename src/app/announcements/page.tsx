"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Megaphone, Plus, Clock, CheckCircle, Trash2, Loader2,
  CalendarX, BellOff, Info, X, Save, EyeOff, AlertTriangle,
  Calendar, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Announcement {
  id: string;
  title: string;
  message: string;
  status: "scheduled" | "expired" | "sent";
  scheduled_for: string | null; // used as expires_at
  created_at: string;
}

/* How much time is left until expiry */
function timeUntilExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 1)  return `${days}d left`;
  if (days === 1) return `1d ${hours}h left`;
  if (hours > 0)  return `${hours}h left`;
  return "< 1h left";
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AnnouncementsPage() {
  const [showModal, setShowModal]       = useState(false);
  const [title, setTitle]               = useState("");
  const [message, setMessage]           = useState("");
  const [expiresAt, setExpiresAt]       = useState("");
  const [saving, setSaving]             = useState(false);

  const [expiringId, setExpiringId]         = useState<string | null>(null);
  const [inactivatingId, setInactivatingId] = useState<string | null>(null);
  const [activatingId, setActivatingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // id to confirm delete

  const [visibleActiveCount,   setVisibleActiveCount]   = useState(10);
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(10);
  const [visibleExpiredCount,  setVisibleExpiredCount]  = useState(10);

  const { data: announcements = [], mutate, isLoading } =
    useSWR<Announcement[]>("/api/announcements", fetcher, { refreshInterval: 60000 });

  const active   = useMemo(() => announcements.filter((a) => a.status === "scheduled"), [announcements]);
  const inactive = useMemo(() => announcements.filter((a) => a.status === "sent"),      [announcements]);
  const expired  = useMemo(() => announcements.filter((a) => a.status === "expired"),   [announcements]);

  function openModal() {
    setTitle(""); setMessage(""); setExpiresAt("");
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, expires_at: expiresAt }),
    });
    setSaving(false);
    setShowModal(false);
    await mutate();
  }

  async function handleExpire(id: string) {
    setExpiringId(id);
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "expire" }),
    });
    if (res.ok) {
      mutate(
        announcements.map((a) => a.id === id ? { ...a, status: "expired" as const } : a),
        { revalidate: true }
      );
    }
    setExpiringId(null);
  }

  async function handleActivate(id: string) {
    setActivatingId(id);
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
    if (res.ok) {
      mutate(
        announcements.map((a) => a.id === id ? { ...a, status: "scheduled" as const } : a),
        { revalidate: true }
      );
    }
    setActivatingId(null);
  }

  async function handleInactivate(id: string) {
    setInactivatingId(id);
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inactive" }),
    });
    if (res.ok) {
      mutate(
        announcements.map((a) => a.id === id ? { ...a, status: "sent" as const } : a),
        { revalidate: true }
      );
    }
    setInactivatingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirm(null);
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    mutate(announcements.filter((a) => a.id !== id), { revalidate: false });
    setDeletingId(null);
  }

  return (
    <AppShell>
      <div className="space-y-6 w-full">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              AI Announcements
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Active announcements are read by the AI agent and override availability when booking.
            </p>
          </div>
          <button
            onClick={openModal}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {/* How it works callout */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl text-sm"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
        >
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed text-xs">
            <strong>How it works:</strong> Create an announcement like "Not working next Monday" with an expiry date.
            While active, the AI agent will read it and automatically block those time slots when customers try to book.
            Once the expiry date passes, the announcement deactivates automatically.
            You can also manually set an announcement to <strong>Inactive</strong> to stop the AI from using it without deleting it.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <>
            {/* ── Active announcements ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h2 className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                  Active
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  {active.length}
                </span>
              </div>

              {active.length === 0 ? (
                <div
                  className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
                  style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}
                >
                  <BellOff className="w-8 h-8" style={{ color: "var(--outline)" }} />
                  <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                    No active announcements. The AI agent is using the regular schedule.
                  </p>
                  <button
                    onClick={openModal}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--primary-container)", color: "var(--primary)" }}
                  >
                    Create Announcement
                  </button>
                </div>
              ) : (
                <>
                  {active.slice(0, visibleActiveCount).map((a) => (
                    <ActiveCard
                      key={a.id}
                      a={a}
                      expiringId={expiringId}
                      inactivatingId={inactivatingId}
                      deletingId={deletingId}
                      onExpire={handleExpire}
                      onInactivate={handleInactivate}
                      onDelete={(id) => setDeleteConfirm(id)}
                    />
                  ))}
                  {visibleActiveCount < active.length && (
                    <div className="p-2 flex justify-center mt-2">
                      <button
                        onClick={() => setVisibleActiveCount((prev) => prev + 10)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-80"
                        style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}
                      >
                        Show more
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── Inactive announcements ── */}
            {inactive.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
                  <h2 className="text-sm font-bold" style={{ color: "var(--on-surface-variant)" }}>
                    Inactive
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                  >
                    {inactive.length}
                  </span>
                </div>

                {inactive.slice(0, visibleInactiveCount).map((a) => (
                  <InactiveCard
                    key={a.id}
                    a={a}
                    activatingId={activatingId}
                    deletingId={deletingId}
                    onActivate={handleActivate}
                    onDelete={(id) => setDeleteConfirm(id)}
                  />
                ))}

                {visibleInactiveCount < inactive.length && (
                  <div className="p-2 flex justify-center mt-2">
                    <button
                      onClick={() => setVisibleInactiveCount((prev) => prev + 10)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-80"
                      style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}
                    >
                      Show more
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ── Expired announcements ── */}
            {expired.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--outline)" }} />
                  <h2 className="text-sm font-bold" style={{ color: "var(--on-surface-variant)" }}>
                    Expired
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                  >
                    {expired.length}
                  </span>
                </div>

                {expired.slice(0, visibleExpiredCount).map((a) => (
                  <ExpiredCard
                    key={a.id}
                    a={a}
                    deletingId={deletingId}
                    onDelete={(id) => setDeleteConfirm(id)}
                  />
                ))}

                {visibleExpiredCount < expired.length && (
                  <div className="p-2 flex justify-center mt-2">
                    <button
                      onClick={() => setVisibleExpiredCount((prev) => prev + 10)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-80"
                      style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}
                    >
                      Show more
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Create Announcement Modal ══ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-container)", color: "var(--primary)" }}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  New Announcement
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 rounded-b-2xl">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Title <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Not working next Monday"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{
                    background: "var(--surface-container-low)",
                    color: "var(--on-surface)",
                    border: "2px solid transparent",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Message <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the schedule change in plain language, e.g. 'I will not be available on Monday April 7. Please book any other available day.'"
                  className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                  style={{
                    background: "var(--surface-container-low)",
                    color: "var(--on-surface)",
                    border: "2px solid transparent",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                />
                <p className="text-[10px]" style={{ color: "var(--outline)" }}>
                  Write naturally — the AI will read this exactly as written to decide what slots to offer.
                </p>
              </div>

              {/* Expire date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Expires At <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <DateTimePicker value={expiresAt} onChange={setExpiresAt} />
                <p className="text-[10px]" style={{ color: "var(--outline)" }}>
                  The announcement will automatically deactivate at this date and time.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />}
                  Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Confirmation Modal ══ */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}
          >
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--error-container)" }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: "var(--error)" }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>
                  Delete Announcement?
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
                  This will permanently remove the announcement. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  Keep It
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deletingId === deleteConfirm}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "var(--error)", color: "var(--on-error)" }}
                >
                  {deletingId === deleteConfirm
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ── Active announcement card ──────────────────────────────── */
function ActiveCard({
  a, expiringId, inactivatingId, deletingId, onExpire, onInactivate, onDelete,
}: {
  a: Announcement;
  expiringId: string | null;
  inactivatingId: string | null;
  deletingId: string | null;
  onExpire: (id: string) => void;
  onInactivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const timeLeft   = a.scheduled_for ? timeUntilExpiry(a.scheduled_for) : null;
  const isExpiring    = expiringId    === a.id;
  const isInactivating = inactivatingId === a.id;
  const isDeleting = deletingId === a.id;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.07)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.15)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#16a34a" }}>
            Active
          </span>
        </div>
        {timeLeft && (
          <div className="flex items-center gap-1" style={{ color: "#16a34a" }}>
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-semibold">
              {a.scheduled_for ? `Expires ${fmtDateTime(a.scheduled_for)}` : ""} · {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
            >
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                Created {fmtDate(a.created_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Set Inactive */}
            {isInactivating ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--on-surface-variant)" }} />
            ) : (
              <button
                onClick={() => onInactivate(a.id)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(245,158,11,0.12)", color: "#92400e" }}
                title="Set to inactive — AI will stop reading this"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Inactive
              </button>
            )}
            {/* Expire Now */}
            {isExpiring ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--on-surface-variant)" }} />
            ) : (
              <button
                onClick={() => onExpire(a.id)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(234,179,8,0.12)", color: "#a16207" }}
                title="Expire this announcement now"
              >
                <CalendarX className="w-3.5 h-3.5" />
                Expire
              </button>
            )}
            {/* Delete */}
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#f44336" }} />
            ) : (
              <button
                onClick={() => onDelete(a.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                style={{ background: "var(--error-container)", color: "var(--error)" }}
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--on-surface-variant)" }}>
          {a.message}
        </p>

        {/* AI context note */}
        <div
          className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
        >
          <CheckCircle className="w-3 h-3 flex-shrink-0" />
          AI agent is reading this and applying it to availability
        </div>
      </div>
    </div>
  );
}

/* ── Inactive announcement card ────────────────────────────── */
function InactiveCard({
  a, activatingId, deletingId, onActivate, onDelete,
}: {
  a: Announcement;
  activatingId: string | null;
  deletingId: string | null;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isActivating = activatingId === a.id;
  const isDeleting   = deletingId   === a.id;

  return (
    <div
      className="rounded-2xl overflow-hidden opacity-80"
      style={{ background: "var(--surface-container-lowest)", border: "1px solid rgba(245,158,11,0.25)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(245,158,11,0.07)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>
            Inactive
          </span>
        </div>
        {a.scheduled_for && (
          <span className="text-[10px]" style={{ color: "#92400e" }}>
            Expires {fmtDateTime(a.scheduled_for)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <Megaphone className="w-4 h-4" style={{ color: "#d97706" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                Created {fmtDate(a.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Activate button */}
            {isActivating ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#16a34a" }} />
            ) : (
              <button
                onClick={() => onActivate(a.id)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}
                title="Set back to active — AI will start reading this again"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Activate
              </button>
            )}
            {/* Delete button */}
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#f44336" }} />
            ) : (
              <button
                onClick={() => onDelete(a.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all hover:opacity-80"
                style={{ background: "var(--error-container)", color: "var(--error)" }}
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed mt-3 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>
          {a.message}
        </p>

        <div
          className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(245,158,11,0.08)", color: "#92400e" }}
        >
          <EyeOff className="w-3 h-3 flex-shrink-0" />
          AI agent is not reading this — click Activate to re-enable
        </div>
      </div>
    </div>
  );
}

/* ── Expired announcement card ─────────────────────────────── */
function ExpiredCard({
  a, deletingId, onDelete,
}: {
  a: Announcement;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  const isDeleting = deletingId === a.id;

  return (
    <div
      className="rounded-2xl overflow-hidden opacity-60"
      style={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--outline-variant)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--outline)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--outline)" }}>
            Expired
          </span>
        </div>
        {a.scheduled_for && (
          <span className="text-[10px]" style={{ color: "var(--outline)" }}>
            Expired {fmtDateTime(a.scheduled_for)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface-container-high)" }}
            >
              <Megaphone className="w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                Created {fmtDate(a.created_at)}
              </p>
            </div>
          </div>

          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#f44336" }} />
          ) : (
            <button
              onClick={() => onDelete(a.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all hover:opacity-80"
              style={{ background: "var(--error-container)", color: "var(--error)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <p className="text-sm leading-relaxed mt-3 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>
          {a.message}
        </p>
      </div>
    </div>
  );
}

/* ══ DateTimePicker ══════════════════════════════════════════ */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];

function parseValue(val: string): { year: number; month: number; day: number; hour: string; minute: string } | null {
  if (!val) return null;
  const [datePart, timePart] = val.split("T");
  if (!datePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [h = "09", min = "00"] = (timePart ?? "09:00").split(":");
  return { year: y, month: m - 1, day: d, hour: h, minute: min };
}

function toValueString(year: number, month: number, day: number, hour: string, minute: string): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hour}:${minute}`;
}

function fmtPickerDisplay(val: string): string {
  const p = parseValue(val);
  if (!p) return "";
  const d = new Date(p.year, p.month, p.day);
  const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const h = parseInt(p.hour, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${dateStr} · ${h12}:${p.minute} ${ampm}`;
}

function DateTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]           = useState(false);
  const [openUp, setOpenUp]       = useState(false);
  const [tab, setTab]             = useState<"date" | "time">("date");
  const containerRef              = useRef<HTMLDivElement>(null);
  const triggerRef                = useRef<HTMLButtonElement>(null);
  const hourRef                   = useRef<HTMLDivElement>(null);
  const minuteRef                 = useRef<HTMLDivElement>(null);

  const now   = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };

  const parsed = parseValue(value);
  const initYear  = parsed?.year  ?? today.year;
  const initMonth = parsed?.month ?? today.month;

  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const selYear   = parsed?.year   ?? null;
  const selMonth  = parsed?.month  ?? null;
  const selDay    = parsed?.day    ?? null;
  const selHour   = parsed?.hour   ?? "09";
  const selMinute = parsed?.minute ?? "00";

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* scroll hour/minute lists to selected when time tab opens */
  useEffect(() => {
    if (open && tab === "time") {
      requestAnimationFrame(() => {
        const hEl = hourRef.current?.querySelector("[data-selected]") as HTMLElement | null;
        if (hEl) hEl.scrollIntoView({ block: "center" });
        const mEl = minuteRef.current?.querySelector("[data-selected]") as HTMLElement | null;
        if (mEl) mEl.scrollIntoView({ block: "center" });
      });
    }
  }, [open, tab]);

  /* build calendar grid */
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    onChange(toValueString(viewYear, viewMonth, day, selHour, selMinute));
    setTab("time");
  }
  function selectHour(h: string) {
    if (selDay !== null && selMonth !== null && selYear !== null) {
      onChange(toValueString(selYear, selMonth, selDay, h, selMinute));
    }
  }
  function selectMinute(m: string) {
    if (selDay !== null && selMonth !== null && selYear !== null) {
      onChange(toValueString(selYear, selMonth, selDay, selHour, m));
    }
  }

  function isPast(day: number): boolean {
    if (viewYear < today.year) return true;
    if (viewYear > today.year) return false;
    if (viewMonth < today.month) return true;
    if (viewMonth > today.month) return false;
    return day < today.day;
  }
  function isToday(day: number): boolean {
    return viewYear === today.year && viewMonth === today.month && day === today.day;
  }
  function isSelected(day: number): boolean {
    return selYear === viewYear && selMonth === viewMonth && selDay === day;
  }

  const display = value ? fmtPickerDisplay(value) : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setOpenUp(window.innerHeight - rect.bottom < 420);
          }
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left transition-all"
        style={{
          background: "var(--surface-container-low)",
          color: display ? "var(--on-surface)" : "var(--outline)",
          border: `2px solid ${open ? "var(--primary)" : "transparent"}`,
        }}
      >
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary)" }} />
        <span className="flex-1">{display ?? "Select expiry date & time"}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: "var(--on-surface-variant)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute left-0 right-0 z-[200] rounded-2xl overflow-hidden ${openUp ? "bottom-full mb-2" : "mt-2"}`}
          style={{
            background: "var(--surface-container-lowest)",
            boxShadow: "0px 16px 40px rgba(20,29,36,0.22)",
            border: "1px solid var(--outline-variant)",
          }}
        >
          {/* Tab row */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--outline-variant)" }}
          >
            {(["date", "time"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  color: tab === t ? "var(--primary)" : "var(--on-surface-variant)",
                  borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {t === "date" ? "📅  Date" : "🕐  Time"}
              </button>
            ))}
          </div>

          {/* ── DATE TAB ── */}
          {tab === "date" && (
            <div className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: "var(--outline)" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} />;
                  const past     = isPast(day);
                  const todayDay = isToday(day);
                  const selected = isSelected(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={past}
                      onClick={() => selectDay(day)}
                      className="aspect-square flex items-center justify-center rounded-xl text-xs font-semibold mx-auto w-8 h-8 transition-all"
                      style={{
                        background: selected
                          ? "var(--primary)"
                          : todayDay
                          ? "var(--primary-container)"
                          : "transparent",
                        color: selected
                          ? "var(--on-primary)"
                          : past
                          ? "var(--outline)"
                          : todayDay
                          ? "var(--primary)"
                          : "var(--on-surface)",
                        opacity: past ? 0.35 : 1,
                        cursor: past ? "not-allowed" : "pointer",
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {selDay !== null && selMonth === viewMonth && selYear === viewYear && (
                <div
                  className="mt-4 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                  style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {MONTH_NAMES[viewMonth]} {selDay}, {viewYear} selected — now pick a time
                  <button
                    type="button"
                    onClick={() => setTab("time")}
                    className="ml-auto text-xs font-bold underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Set time →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TIME TAB ── */}
          {tab === "time" && (
            <div className="p-4">
              {selDay === null ? (
                <div className="py-6 flex flex-col items-center gap-2 text-center">
                  <Calendar className="w-6 h-6" style={{ color: "var(--outline)" }} />
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                    Select a date first
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("date")}
                    className="text-xs font-bold"
                    style={{ color: "var(--primary)" }}
                  >
                    ← Go to date
                  </button>
                </div>
              ) : (
                <>
                  {/* Selected date reminder */}
                  <div
                    className="mb-4 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                  >
                    <Calendar className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    {MONTH_NAMES[selMonth!]} {selDay}, {selYear}
                    <button
                      type="button"
                      onClick={() => setTab("date")}
                      className="ml-auto text-xs underline"
                      style={{ color: "var(--primary)" }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Time pickers */}
                  <div className="flex gap-3">
                    {/* Hours */}
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "var(--outline)" }}>
                        Hour
                      </p>
                      <div
                        ref={hourRef}
                        className="overflow-y-auto rounded-xl"
                        style={{ height: 180, background: "var(--surface-container-low)" }}
                      >
                        {HOURS.map((h) => {
                          const sel = h === selHour;
                          const hNum = parseInt(h, 10);
                          const ampm = hNum >= 12 ? "PM" : "AM";
                          const h12  = hNum % 12 === 0 ? 12 : hNum % 12;
                          return (
                            <button
                              key={h}
                              type="button"
                              data-selected={sel || undefined}
                              onClick={() => selectHour(h)}
                              className="w-full py-2 text-xs font-semibold transition-all"
                              style={{
                                background: sel ? "var(--primary)" : "transparent",
                                color: sel ? "var(--on-primary)" : "var(--on-surface)",
                                borderRadius: sel ? "8px" : undefined,
                              }}
                            >
                              {h12}:00 {ampm}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Minutes */}
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "var(--outline)" }}>
                        Minute
                      </p>
                      <div
                        ref={minuteRef}
                        className="overflow-y-auto rounded-xl"
                        style={{ height: 180, background: "var(--surface-container-low)" }}
                      >
                        {MINUTES.map((m) => {
                          const sel = m === selMinute;
                          return (
                            <button
                              key={m}
                              type="button"
                              data-selected={sel || undefined}
                              onClick={() => selectMinute(m)}
                              className="w-full py-2 text-xs font-semibold transition-all"
                              style={{
                                background: sel ? "var(--primary)" : "transparent",
                                color: sel ? "var(--on-primary)" : "var(--on-surface)",
                                borderRadius: sel ? "8px" : undefined,
                              }}
                            >
                              :{m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Done button */}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-4 w-full py-2.5 text-sm font-bold rounded-xl btn-primary"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
