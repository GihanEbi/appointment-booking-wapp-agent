"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarDays, Plus, Search, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_FILTERS = ["All", "Confirmed", "Pending", "Canceled"] as const;

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "confirmed" | "pending" | "canceled";
  notes?: string;
}

interface NewApptForm {
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  notes: string;
}

export default function AppointmentsPage() {
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewApptForm>({
    customer_name: "",
    customer_phone: "",
    service: "",
    scheduled_at: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (filter !== "All") params.set("status", filter.toLowerCase());
  if (search) params.set("search", search);
  const url = `/api/appointments?${params}`;

  const { data: appointments, mutate } = useSWR<Appointment[]>(url, fetcher, {
    refreshInterval: 15000,
  });

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await mutate();
    setUpdatingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ customer_name: "", customer_phone: "", service: "", scheduled_at: "", notes: "" });
    await mutate();
  }

  const statusBadge = (status: string) => {
    if (status === "confirmed") return { bg: "var(--primary-container)", color: "var(--on-primary-container)", icon: CheckCircle, label: "Confirmed" };
    if (status === "pending") return { bg: "var(--tertiary-container)", color: "var(--on-tertiary-container)", icon: Clock, label: "Pending" };
    return { bg: "#f443361a", color: "#f44336", icon: XCircle, label: "Canceled" };
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Appointment Management Hub
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Manage all client bookings from your AI-powered WhatsApp agent.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>

        {/* Filter bar */}
        <div
          className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 20px rgba(20,29,36,0.04)" }}
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
            <input
              type="text"
              placeholder="Search by name or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
              style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: filter === f ? "var(--primary)" : "var(--surface-container-low)",
                  color: filter === f ? "var(--on-primary)" : "var(--on-surface-variant)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments list */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" style={{ color: "var(--primary)" }} />
              <h2 className="font-bold" style={{ color: "var(--on-surface)" }}>All Appointments</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
              {appointments?.length ?? 0} total
            </span>
          </div>

          {!appointments ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: "var(--on-surface-variant)" }}>
              No appointments found. Bookings made via WhatsApp will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => {
                const badge = statusBadge(appt.status);
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: "var(--surface-container-low)" }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                        color: "var(--on-primary)",
                      }}
                    >
                      {initials(appt.customer_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                        {appt.customer_name}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>
                        {appt.service} · {formatTime(appt.scheduled_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div
                      className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {updatingId === appt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-2" style={{ color: "var(--primary)" }} />
                      ) : (
                        <>
                          {appt.status !== "confirmed" && (
                            <button
                              onClick={() => updateStatus(appt.id, "confirmed")}
                              className="text-xs px-2 py-1 rounded-lg font-medium transition-all"
                              style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                            >
                              Confirm
                            </button>
                          )}
                          {appt.status !== "canceled" && (
                            <button
                              onClick={() => updateStatus(appt.id, "canceled")}
                              className="text-xs px-2 py-1 rounded-lg font-medium transition-all"
                              style={{ background: "#f443361a", color: "#f44336" }}
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-16 lg:hidden" />
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface-container-lowest)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>
              New Booking
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { label: "Customer Name", key: "customer_name", type: "text", required: true },
                { label: "Phone Number", key: "customer_phone", type: "tel", required: true },
                { label: "Service", key: "service", type: "text", required: true },
                { label: "Date & Time", key: "scheduled_at", type: "datetime-local", required: true },
                { label: "Notes (optional)", key: "notes", type: "text", required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    required={required}
                    value={form[key as keyof NewApptForm]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
              ))}

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
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
