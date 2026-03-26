"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { Megaphone, Plus, Clock, CheckCircle, Users, Eye, Loader2, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusStyle: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  scheduled: { bg: "var(--tertiary-container)", text: "var(--on-tertiary-container)", icon: Clock, label: "Scheduled" },
  sent: { bg: "var(--primary-container)", text: "var(--on-primary-container)", icon: CheckCircle, label: "Sent" },
  expired: { bg: "var(--surface-container-high)", text: "var(--on-surface-variant)", icon: Clock, label: "Expired" },
};

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  status: string;
  scheduled_for: string | null;
  reach: number;
  created_at: string;
}

interface AnnouncementForm {
  title: string;
  message: string;
  audience: string;
  scheduled_for: string;
}

export default function AnnouncementsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    message: "",
    audience: "All",
    scheduled_for: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: announcements, mutate, isLoading } = useSWR<Announcement[]>(
    "/api/announcements",
    fetcher
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ title: "", message: "", audience: "All", scheduled_for: "" });
    await mutate();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await mutate();
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              AI Announcements &amp; Rules
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Broadcast important updates to your clients via WhatsApp AI.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : !announcements || announcements.length === 0 ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-3"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)", color: "var(--on-surface-variant)" }}
          >
            <Megaphone className="w-10 h-10 opacity-30" />
            <p className="text-sm text-center">No announcements yet. Create one to broadcast updates to your clients via WhatsApp.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const s = statusStyle[a.status] ?? statusStyle.draft;
              const StatusIcon = s.icon;
              return (
                <div
                  key={a.id}
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
                      >
                        <Megaphone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                          {a.scheduled_for
                            ? new Date(a.scheduled_for).toLocaleString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                                hour: "numeric", minute: "2-digit",
                              })
                            : new Date(a.created_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.text }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {s.label}
                      </div>
                      {deletingId === a.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#f44336" }} />
                      ) : (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "var(--on-surface-variant)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--on-surface-variant)" }}>
                    {a.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {a.audience}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {a.reach} reached
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* New Announcement Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface-container-lowest)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>
              New Announcement
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Holiday Hours Update"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Write your announcement message here..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>Audience</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  >
                    <option value="All">All Clients</option>
                    <option value="Premium Members">Premium Members</option>
                    <option value="New Clients">New Clients</option>
                    <option value="Affected Clients">Affected Clients</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>Schedule For (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_for}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_for: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {form.scheduled_for ? "Schedule" : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
