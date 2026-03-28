"use client";

import useSWR from "swr";
import { CalendarDays, Clock, CheckCircle, XCircle, Loader2, User } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "canceled";
  cancel_reason?: string | null;
  created_at: string;
}

function isNew(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  bio: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8", label: "Pending" },
  confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#16a34a", label: "Confirmed" },
  canceled:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", label: "Canceled" },
};

export default function StaffDashboardPage() {
  const { data: me, isLoading: loadingMe }   = useSWR<StaffUser>("/api/staff/me", fetcher);
  const { data: appointments = [], isLoading } = useSWR<Appointment[]>("/api/staff/appointments", fetcher);

  const now       = new Date();
  const upcoming  = appointments.filter((a) => a.status !== "canceled" && new Date(a.scheduled_at) >= now);
  const today     = upcoming.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const pending   = appointments.filter((a) => a.status === "pending").length;

  if (loadingMe) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
          {me?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
            Hello, {me?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Here's your appointment overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today",     value: today.length,     color: "#6366f1", icon: CalendarDays },
          { label: "Upcoming",  value: upcoming.length,  color: "#0ea5e9", icon: Clock },
          { label: "Confirmed", value: confirmed,         color: "#10b981", icon: CheckCircle },
          { label: "Pending",   value: pending,           color: "#f59e0b", icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}20` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--on-surface)" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>Upcoming Appointments</h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} /></div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
            <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--outline)" }} />
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((a) => {
              const st = STATUS_STYLES[a.status] ?? STATUS_STYLES.pending;
              return (
                <div key={a.id} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 4px 12px rgba(20,29,36,0.05)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
                    {a.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--on-surface)" }}>{a.customer_name}</p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{a.service}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--outline)" }}>
                      {fmtDate(a.scheduled_at)} · {fmtTime(a.scheduled_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    {isNew(a.created_at) && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse"
                        style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>NEW</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-16 lg:hidden" />
    </div>
  );
}
