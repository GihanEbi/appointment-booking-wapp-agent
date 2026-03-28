"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { CalendarDays, Loader2, Search, Filter } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "canceled";
  notes?: string | null;
  cancel_reason?: string | null;
  updated_at?: string;
  created_at: string;
}

function isNew(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;
}

const STATUS_CFG = {
  pending:   { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8", label: "Pending" },
  confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#16a34a", label: "Confirmed" },
  canceled:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", label: "Canceled" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
}

export default function StaffAppointmentsPage() {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<"all" | "pending" | "confirmed" | "canceled">("all");

  const { data: appointments = [], isLoading } = useSWR<Appointment[]>("/api/staff/appointments", fetcher);

  const filtered = useMemo(() => {
    let list = appointments;
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.customer_name.toLowerCase().includes(q) ||
        a.customer_phone.includes(q) ||
        a.service.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, filter, search]);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>My Appointments</h1>
        <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
          View-only — contact your admin for any changes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--surface-container-lowest)", border: "1.5px solid var(--outline-variant)" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--outline)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or service…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--on-surface)" }} />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "confirmed", "canceled"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
              style={{
                background: filter === s ? "var(--primary)" : "var(--surface-container-lowest)",
                color: filter === s ? "var(--on-primary)" : "var(--on-surface-variant)",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
          <CalendarDays className="w-9 h-9" style={{ color: "var(--outline)" }} />
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {appointments.length === 0 ? "No appointments assigned to you yet." : "No results match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const st = STATUS_CFG[a.status] ?? STATUS_CFG.pending;
            const ts = a.updated_at ?? a.created_at;
            return (
              <div key={a.id} className="rounded-2xl overflow-hidden"
                style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.06)" }}>
                {/* Status strip */}
                <div className="flex items-center justify-between px-4 py-1.5"
                  style={{ background: st.bg, borderBottom: `1px solid ${st.color}30` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: st.color }}>
                      {st.label}
                    </span>
                    {isNew(a.created_at) && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse"
                        style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>NEW</span>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: st.color }}>Updated {timeAgo(ts)}</span>
                </div>

                <div className="p-4 flex gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
                    {a.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.customer_name}</p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{a.customer_phone}</p>
                    <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>{a.service}</p>
                    <p className="text-xs" style={{ color: "var(--outline)" }}>
                      {fmtDate(a.scheduled_at)} · {fmtTime(a.scheduled_at)}
                    </p>
                    {a.cancel_reason && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                        Reason: {a.cancel_reason}
                      </span>
                    )}
                    {a.notes && (
                      <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>Note: {a.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-16 lg:hidden" />
    </div>
  );
}
