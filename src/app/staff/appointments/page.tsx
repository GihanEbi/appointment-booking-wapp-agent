"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  CalendarDays, Loader2, Search, List, Calendar,
  CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Clock,
  CheckCircle, XCircle,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "canceled" | "completed";
  notes?: string | null;
  cancel_reason?: string | null;
  updated_at?: string;
  created_at: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_CFG = {
  pending:   { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8", label: "Pending",   icon: Clock         },
  confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#16a34a", label: "Confirmed", icon: CheckCircle   },
  canceled:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", label: "Canceled",  icon: XCircle       },
  completed: { bg: "rgba(34,197,94,0.15)",   color: "#15803d", label: "Completed", icon: CheckCircle2  },
  overdue:   { bg: "rgba(249,115,22,0.15)",  color: "#ea580c", label: "Overdue",   icon: AlertTriangle },
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
function isNew(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;
}
function getOverdueDays(scheduledAt: string): number {
  const scheduled = new Date(scheduledAt);
  scheduled.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
function isoDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type CalCell = { day: number; month: number; year: number; current: boolean };
function buildCalendarCells(year: number, month: number): CalCell[] {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: CalCell[] = [];
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, month: prevMonth, year: prevYear, current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month, year, current: true });
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  let next = 1;
  while (cells.length < 42)
    cells.push({ day: next++, month: nextMonth, year: nextYear, current: false });
  return cells;
}

function statusColor(status: string) {
  if (status === "confirmed") return "#16a34a";
  if (status === "pending")   return "#1d4ed8";
  if (status === "completed") return "#15803d";
  if (status === "overdue")   return "#ea580c";
  return "#dc2626";
}

export default function StaffAppointmentsPage() {
  const [view,   setView]   = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "canceled" | "completed" | "overdue">("all");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = new Date();
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: appointments = [], isLoading, mutate } = useSWR<Appointment[]>(
    "/api/staff/appointments", fetcher, { refreshInterval: 15000 }
  );

  // Mark appointment as completed
  async function handleComplete(id: string) {
    setCompletingId(id);
    const res = await fetch(`/api/staff/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      const updated = await res.json();
      mutate(
        (prev) => prev?.map((a) => (a.id === id ? { ...a, ...updated } : a)),
        { revalidate: true }
      );
    }
    setCompletingId(null);
  }

  // Filtered list for list view
  const filtered = useMemo(() => {
    let list = appointments;
    if (filter === "overdue" && mounted) {
      list = list.filter((a) => a.status === "confirmed" && getOverdueDays(a.scheduled_at) > 0);
    } else if (filter !== "all") {
      list = list.filter((a) => a.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.customer_name.toLowerCase().includes(q) ||
        a.customer_phone.includes(q) ||
        a.service.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, filter, search, mounted]);

  // Calendar data
  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const d   = new Date(appt.scheduled_at);
      const key = isoDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      (map[key] ??= []).push(appt);
    }
    return map;
  }, [appointments]);

  const calendarCells = useMemo(() => buildCalendarCells(calYear, calMonth), [calYear, calMonth]);

  const selectedDayAppts = useMemo(() =>
    selectedDate
      ? [...(apptsByDate[selectedDate] ?? [])].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
      : [],
    [apptsByDate, selectedDate]
  );

  const thisMonthCount = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  }).length;

  function prevMonth() {
    setSelectedDate(null);
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  // ── Appointment card ──────────────────────────────────────────────────────
  function ApptCard({ appt }: { appt: Appointment }) {
    const overdueDays   = (mounted && appt.status === "confirmed") ? getOverdueDays(appt.scheduled_at) : 0;
    const displayStatus = overdueDays > 0 ? "overdue" : appt.status;
    const st            = STATUS_CFG[displayStatus] ?? STATUS_CFG.confirmed;
    const Icon          = st.icon;
    const isCompleting  = completingId === appt.id;
    const ts            = appt.updated_at ?? appt.created_at;

    return (
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.06)" }}>

        {/* Status strip */}
        <div className="flex items-center justify-between px-4 py-1.5"
          style={{ backgroundColor: st.bg, borderBottom: `1px solid ${st.color}30` }}>
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: st.color }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: st.color }}>
              {st.label}
            </span>
            {overdueDays > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: st.color }}>
                · Overdue by {overdueDays} day{overdueDays !== 1 ? "s" : ""}
              </span>
            )}
            {isNew(appt.created_at) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse"
                style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#6366f1" }}>NEW</span>
            )}
          </div>
          <span className="text-[10px]" style={{ color: st.color }}>Updated {timeAgo(ts)}</span>
        </div>

        <div className="p-4 flex gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            {appt.customer_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{appt.customer_name}</p>
            <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{appt.customer_phone}</p>
            <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>{appt.service}</p>
            <p className="text-xs" style={{ color: "var(--outline)" }}>
              {fmtDate(appt.scheduled_at)} · {fmtTime(appt.scheduled_at)}
            </p>
            {appt.cancel_reason && (
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                Reason: {appt.cancel_reason}
              </span>
            )}
            {appt.notes && (
              <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>Note: {appt.notes}</p>
            )}
          </div>

          {/* Complete button — only for confirmed (including overdue) */}
          {appt.status === "confirmed" && (
            <div className="flex-shrink-0 self-center">
              {isCompleting ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#15803d" }} />
              ) : (
                <button
                  onClick={() => handleComplete(appt.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#15803d" }}
                >
                  Complete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">

      {/* Header + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>My Appointments</h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
            Mark confirmed appointments as completed when done.
          </p>
        </div>
        <div className="flex rounded-xl p-1 gap-1 self-start sm:self-auto"
          style={{ backgroundColor: "var(--surface-container-high)" }}>
          {(["list", "calendar"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: view === v ? "var(--primary)" : "transparent",
                color:           view === v ? "var(--on-primary)" : "var(--on-surface-variant)",
              }}>
              {v === "list" ? <List className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              {v === "list" ? "List" : "Calendar"}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: "var(--surface-container-lowest)", border: "1.5px solid var(--outline-variant)" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--outline)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone or service…"
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--on-surface)" }} />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "pending", "confirmed", "canceled", "completed", "overdue"] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                  style={{
                    backgroundColor: filter === s ? "var(--primary)" : "var(--surface-container-lowest)",
                    color:           filter === s ? "var(--on-primary)" : "var(--on-surface-variant)",
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
              style={{ backgroundColor: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
              <CalendarDays className="w-9 h-9" style={{ color: "var(--outline)" }} />
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                {appointments.length === 0 ? "No appointments assigned to you yet." : "No results match your filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => <ApptCard key={a.id} appt={a} />)}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>

            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <button onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
                style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>
                  {MONTHS[calMonth]} {calYear}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                  {thisMonthCount} appointment{thisMonthCount !== 1 ? "s" : ""} this month
                </p>
              </div>
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
                style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold"
                  style={{ color: "var(--on-surface-variant)" }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, i) => {
                const key       = isoDateKey(cell.year, cell.month, cell.day);
                const cellAppts = apptsByDate[key] ?? [];
                const isToday   = cell.current && cell.day === today.getDate()
                  && cell.month === today.getMonth() && cell.year === today.getFullYear();
                const isSelected = selectedDate === key && cell.current;
                return (
                  <div key={i}
                    onClick={() => cell.current && setSelectedDate(isSelected ? null : key)}
                    className="min-h-[90px] p-1.5 transition-colors"
                    style={{
                      borderRight:  i % 7 !== 6  ? "1px solid var(--outline-variant)" : undefined,
                      borderBottom: i < 35        ? "1px solid var(--outline-variant)" : undefined,
                      backgroundColor: isSelected ? "var(--primary-container)" : "transparent",
                      cursor:       cell.current  ? "pointer" : "default",
                      opacity:      cell.current  ? 1 : 0.3,
                    }}>
                    <div className="flex justify-center mb-1">
                      <span className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                        style={{
                          backgroundColor: isToday ? "var(--primary)" : "transparent",
                          color: isToday ? "var(--on-primary)"
                            : isSelected ? "var(--on-primary-container)"
                            : cell.current ? "var(--on-surface)"
                            : "var(--on-surface-variant)",
                        }}>
                        {cell.day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {cellAppts.slice(0, 3).map((appt) => {
                        const ds = (mounted && appt.status === "confirmed" && getOverdueDays(appt.scheduled_at) > 0) ? "overdue" : appt.status;
                        const dot = statusColor(ds);
                        return (
                          <div key={appt.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md truncate"
                            style={{ backgroundColor: `${dot}22` }}>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                            <span className="truncate font-medium"
                              style={{ color: dot, fontSize: "10px", lineHeight: "1.4" }}>
                              {fmtTime(appt.scheduled_at)} {appt.customer_name.split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}
                      {cellAppts.length > 3 && (
                        <p className="pl-1 font-medium" style={{ color: "var(--on-surface-variant)", fontSize: "10px" }}>
                          +{cellAppts.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-1 flex-wrap">
            {[
              { label: "Confirmed",  color: "#16a34a" },
              { label: "Pending",    color: "#1d4ed8" },
              { label: "Canceled",   color: "#dc2626" },
              { label: "Completed",  color: "#15803d" },
              { label: "Overdue",    color: "#ea580c" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs"
                style={{ color: "var(--on-surface-variant)" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Selected day panel */}
          {selectedDate && (
            <div className="rounded-2xl p-5"
              style={{ backgroundColor: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold" style={{ color: "var(--on-surface)" }}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric",
                    })}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["confirmed","pending","canceled","completed"] as const).map((s) => {
                    const count = selectedDayAppts.filter((a) => a.status === s).length;
                    if (!count) return null;
                    const cfg = STATUS_CFG[s];
                    return (
                      <span key={s} className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {count} {s}
                      </span>
                    );
                  })}
                </div>
              </div>
              {selectedDayAppts.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--on-surface-variant)" }}>
                  No appointments on this day.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppts.map((appt) => <ApptCard key={appt.id} appt={appt} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-16 lg:hidden" />
    </div>
  );
}
