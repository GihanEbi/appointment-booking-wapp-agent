"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  CalendarDays, Plus, Search, CheckCircle, Clock, XCircle, Loader2,
  ChevronLeft, ChevronRight, List, Calendar, AlertTriangle, MessageSquare,
  CheckCircle2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_FILTERS = ["All", "Confirmed", "Pending", "Canceled", "Completed", "Overdue"] as const;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const CANCEL_REASONS = [
  "Schedule conflict",
  "Customer request",
  "No-show by customer",
  "Overbooked",
  "Service unavailable",
  "Staff unavailable",
  "Other",
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday)    return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)                   return "just now";
  if (diff < 3600)                 return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)                return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2)            return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusUpdatedLabel(status: string): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "canceled")  return "Canceled";
  if (status === "completed") return "Completed";
  if (status === "overdue")   return "Overdue";
  return "Received";
}

function isoDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "confirmed" | "pending" | "canceled" | "completed";
  notes?: string | null;
  cancel_reason?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface NewApptForm {
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  notes: string;
}

interface CancelTarget {
  id: string;
  name: string;
  service: string;
  scheduled_at: string;
}

function getOverdueDays(scheduledAt: string): number {
  const scheduled = new Date(scheduledAt);
  scheduled.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function isOverdue(appt: Appointment): boolean {
  return appt.status === "confirmed" && getOverdueDays(appt.scheduled_at) > 0;
}

function statusStyle(status: string) {
  if (status === "confirmed") return { bg: "var(--primary-container)",    color: "var(--on-primary-container)",  icon: CheckCircle,  label: "Confirmed" };
  if (status === "pending")   return { bg: "var(--tertiary-container)",   color: "var(--on-tertiary-container)", icon: Clock,        label: "Pending"   };
  if (status === "completed") return { bg: "rgba(34,197,94,0.15)",        color: "#16a34a",                      icon: CheckCircle2, label: "Completed" };
  if (status === "overdue")   return { bg: "rgba(249,115,22,0.15)",       color: "#ea580c",                      icon: AlertTriangle,label: "Overdue"   };
  return                             { bg: "#f443361a",                   color: "#f44336",                      icon: XCircle,      label: "Canceled"  };
}

function statusColor(status: string) {
  if (status === "confirmed") return "var(--primary)";
  if (status === "pending")   return "#f59e0b";
  if (status === "completed") return "#16a34a";
  if (status === "overdue")   return "#ea580c";
  return "#f44336";
}

type CalCell = { day: number; month: number; year: number; current: boolean };

function buildCalendarCells(year: number, month: number): CalCell[] {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: CalCell[] = [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, month: prevMonth, year: prevYear, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, current: true });
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, month: nextMonth, year: nextYear, current: false });
  }
  return cells;
}

interface StaffUser { id: string; name: string; email: string; }

export default function AppointmentsPage() {
  const [view,   setView]   = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("All");
  const [search, setSearch] = useState("");

  // Staff-user filter (admin view of a sub-user's schedule)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const { data: staffUsers = [] } = useSWR<StaffUser[]>("/api/staff-users", fetcher, { refreshInterval: 0 });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewApptForm>({
    customer_name: "", customer_phone: "", service: "", scheduled_at: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Per-appointment loading state
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);
  const [completingId,  setCompletingId]  = useState<string | null>(null);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelCustom, setCancelCustom] = useState("");
  const [canceling, setCanceling] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const today = new Date();
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const listParams = new URLSearchParams();
  if (filter === "Overdue")       listParams.set("status", "confirmed");
  else if (filter !== "All")      listParams.set("status", filter.toLowerCase());
  if (search)                     listParams.set("search", search);
  if (selectedStaffId)            listParams.set("assigned_to", selectedStaffId);
  const { data: appointments, mutate } = useSWR<Appointment[]>(
    `/api/appointments?${listParams}`, fetcher, { refreshInterval: 15000 }
  );

  const displayedAppointments = useMemo(() => {
    if (!appointments || !mounted) return appointments;
    if (filter === "Overdue") return appointments.filter(isOverdue);
    return appointments;
  }, [appointments, filter, mounted]);

  const allCalParams = new URLSearchParams();
  if (selectedStaffId) allCalParams.set("assigned_to", selectedStaffId);
  const { data: allAppointments, mutate: mutateAll } = useSWR<Appointment[]>(
    `/api/appointments?${allCalParams}`, fetcher, { refreshInterval: 30000 }
  );

  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of allAppointments ?? []) {
      const d   = new Date(appt.scheduled_at);
      const key = isoDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      (map[key] ??= []).push(appt);
    }
    return map;
  }, [allAppointments]);

  const calendarCells = useMemo(() => buildCalendarCells(calYear, calMonth), [calYear, calMonth]);
  const selectedDayAppts: Appointment[] = selectedDate
    ? [...(apptsByDate[selectedDate] ?? [])].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    : [];

  const thisMonthCount = (allAppointments ?? []).filter((a) => {
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

  /** Patch SWR caches with a single updated appointment, then revalidate. */
  function patchCaches(updated: Appointment) {
    const patcher = (prev: Appointment[] | undefined) =>
      prev ? prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)) : prev;
    mutate(patcher, { revalidate: true });
    mutateAll(patcher, { revalidate: true });
  }

  async function handleConfirm(id: string) {
    setConfirmingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    if (res.ok) patchCaches(await res.json());
    setConfirmingId(null);
  }

  async function handleComplete(id: string) {
    setCompletingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) patchCaches(await res.json());
    setCompletingId(null);
  }

  function openCancel(appt: Appointment) {
    setCancelTarget({ id: appt.id, name: appt.customer_name, service: appt.service, scheduled_at: appt.scheduled_at });
    setCancelReason("");
    setCancelCustom("");
  }

  async function handleCancelSubmit() {
    if (!cancelTarget || !cancelReason) return;
    setCanceling(true);
    const reason = cancelReason === "Other" ? cancelCustom.trim() : cancelReason;
    const res = await fetch(`/api/appointments/${cancelTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "canceled", cancel_reason: reason }),
    });
    if (res.ok) patchCaches(await res.json());
    setCanceling(false);
    setCancelTarget(null);
    setCancelReason("");
    setCancelCustom("");
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
    await Promise.all([mutate(), mutateAll()]);
  }

  // ── Appointment card used in both list + calendar panel ──
  function ApptRow({ appt }: { appt: Appointment }) {
    const overdueDays  = (mounted && appt.status === "confirmed") ? getOverdueDays(appt.scheduled_at) : 0;
    const displayStatus = overdueDays > 0 ? "overdue" : appt.status;
    const badge        = statusStyle(displayStatus);
    const BadgeIcon    = badge.icon;
    const isConfirming = confirmingId === appt.id;
    const isCompleting = completingId === appt.id;

    const ts = appt.updated_at || appt.created_at;

    return (
      <div
        className="rounded-xl overflow-hidden transition-all"
        style={{ background: "var(--surface-container-low)" }}
      >
        {/* Status timestamp strip */}
        <div
          className="flex items-center gap-1.5 px-3.5 py-1.5"
          style={{
            background: badge.bg,
            borderBottom: `1px solid ${badge.color}22`,
          }}
        >
          <BadgeIcon className="w-3 h-3 flex-shrink-0" style={{ color: badge.color }} />
          <span className="text-[10px] font-semibold" style={{ color: badge.color }}>
            {statusUpdatedLabel(displayStatus)}
          </span>
          {overdueDays > 0 && (
            <>
              <span className="text-[10px]" style={{ color: badge.color, opacity: 0.5 }}>·</span>
              <span className="text-[10px] font-semibold" style={{ color: badge.color }}>
                Overdue by {overdueDays} day{overdueDays !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {ts && (
            <>
              <span className="text-[10px]" style={{ color: badge.color, opacity: 0.5 }}>·</span>
              <span className="text-[10px]" style={{ color: badge.color, opacity: 0.7 }}>
                {timeAgo(ts)}
              </span>
            </>
          )}
        </div>

        {/* Card body */}
        <div className="flex items-start gap-3 p-3.5">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
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
          {appt.notes && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--on-surface-variant)", opacity: 0.65 }}>
              {appt.notes}
            </p>
          )}
          {/* Cancel reason shown on canceled cards */}
          {appt.status === "canceled" && appt.cancel_reason && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#f443361a", color: "#f44336" }}
              >
                Reason: {appt.cancel_reason}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0 mt-0.5">
          {(isConfirming || isCompleting) ? (
            <Loader2 className="w-4 h-4 animate-spin mx-2 mt-1" style={{ color: "var(--primary)" }} />
          ) : (
            <>
              {appt.status === "pending" && (
                <button
                  onClick={() => handleConfirm(appt.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                >
                  Confirm
                </button>
              )}
              {appt.status === "confirmed" && (
                <button
                  onClick={() => handleComplete(appt.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}
                >
                  Complete
                </button>
              )}
              {(appt.status === "pending" || appt.status === "confirmed") && (
                <button
                  onClick={() => openCancel(appt)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: "#f443361a", color: "#f44336" }}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
        </div>{/* end card body */}
      </div>
    );
  }

  const cancelReasonFinal = cancelReason === "Other" ? cancelCustom.trim() : cancelReason;
  const canSubmitCancel   = cancelReason !== "" && (cancelReason !== "Other" || cancelCustom.trim() !== "");

  return (
    <AppShell>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              {selectedStaffId
                ? `${staffUsers.find((u) => u.id === selectedStaffId)?.name ?? "Staff"}'s Schedule`
                : "Appointment Management Hub"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              {selectedStaffId
                ? "Viewing appointments assigned to this team member."
                : "Manage all client bookings from your AI-powered WhatsApp agent."}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: "var(--surface-container-high)" }}>
              {(["list", "calendar"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={{
                    backgroundColor: view === v ? "var(--primary)"    : "transparent",
                    color:           view === v ? "var(--on-primary)" : "var(--on-surface-variant)",
                  }}
                >
                  {v === "list" ? <List className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                  {v === "list" ? "List" : "Calendar"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </div>
        </div>

        {/* ── Staff-user selector (only shown when staff users exist) ── */}
        {staffUsers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
              View as:
            </span>
            <button
              onClick={() => { setSelectedStaffId(null); setSelectedDate(null); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: selectedStaffId === null ? "var(--primary)" : "var(--surface-container-low)",
                color:           selectedStaffId === null ? "var(--on-primary)" : "var(--on-surface-variant)",
              }}
            >
              All
            </button>
            {staffUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedStaffId(u.id); setSelectedDate(null); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  backgroundColor: selectedStaffId === u.id ? "var(--primary)" : "var(--surface-container-low)",
                  color:           selectedStaffId === u.id ? "var(--on-primary)" : "var(--on-surface-variant)",
                }}
              >
                {u.name}
              </button>
            ))}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            {/* Filter bar */}
            <div
              className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 20px rgba(20,29,36,0.04)" }}
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--on-surface-variant)" }} />
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
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: filter === f ? "var(--primary)"    : "var(--surface-container-low)",
                      color:           filter === f ? "var(--on-primary)" : "var(--on-surface-variant)",
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
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  {displayedAppointments?.length ?? 0} total
                </span>
              </div>

              {!displayedAppointments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                </div>
              ) : displayedAppointments.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                  No appointments found. Bookings made via WhatsApp will appear here.
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedAppointments.map((appt) => <ApptRow key={appt.id} appt={appt} />)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              {/* Month header */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <button onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
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
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
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
                    <div
                      key={i}
                      onClick={() => cell.current && setSelectedDate(isSelected ? null : key)}
                      className="min-h-[90px] p-1.5 transition-colors"
                      style={{
                        borderRight:  i % 7 !== 6  ? "1px solid var(--outline-variant)" : undefined,
                        borderBottom: i < 35        ? "1px solid var(--outline-variant)" : undefined,
                        background:   isSelected    ? "var(--primary-container)"         : "transparent",
                        cursor:       cell.current  ? "pointer"                          : "default",
                        opacity:      cell.current  ? 1                                  : 0.3,
                      }}
                    >
                      <div className="flex justify-center mb-1">
                        <span
                          className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                          style={{
                            background: isToday ? "var(--primary)" : "transparent",
                            color: isToday ? "var(--on-primary)"
                              : isSelected ? "var(--on-primary-container)"
                              : cell.current ? "var(--on-surface)"
                              : "var(--on-surface-variant)",
                          }}
                        >
                          {cell.day}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {cellAppts.slice(0, 3).map((appt) => {
                          const cellDisplayStatus = (mounted && appt.status === "confirmed" && getOverdueDays(appt.scheduled_at) > 0) ? "overdue" : appt.status;
                          const dotColor = statusColor(cellDisplayStatus);
                          return (
                          <div key={appt.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md truncate"
                            style={{ background: `${dotColor}22` }}>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: dotColor }} />
                            <span className="truncate font-medium"
                              style={{ color: dotColor, fontSize: "10px", lineHeight: "1.4" }}>
                              {new Date(appt.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}{" "}
                              {appt.customer_name.split(" ")[0]}
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
                { label: "Confirmed",  color: "var(--primary)" },
                { label: "Pending",    color: "#f59e0b"        },
                { label: "Canceled",   color: "#f44336"        },
                { label: "Completed",  color: "#16a34a"        },
                { label: "Overdue",    color: "#ea580c"        },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--on-surface-variant)" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Selected day panel */}
            {selectedDate && (
              <div className="rounded-2xl p-5"
                style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
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
                      const st = statusStyle(s);
                      return (
                        <span key={s} className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: st.bg, color: st.color }}>
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
                  <div className="space-y-2">
                    {selectedDayAppts.map((appt) => <ApptRow key={appt.id} appt={appt} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Cancel Reason Modal ══ */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setCancelTarget(null)}
        >
          <div className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#f443361a" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "#f44336" }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Cancel Appointment</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  A message will be sent to the customer immediately
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Appointment preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))", color: "var(--on-primary)" }}>
                  {initials(cancelTarget.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                    {cancelTarget.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>
                    {cancelTarget.service} · {formatTime(cancelTarget.scheduled_at)}
                  </p>
                </div>
              </div>

              {/* WhatsApp notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)" }}>
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#25D366" }} />
                <p style={{ color: "var(--on-surface-variant)" }}>
                  The customer will receive a WhatsApp message with the cancellation reason.
                </p>
              </div>

              {/* Reason dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Cancellation Reason <span style={{ color: "#f44336" }}>*</span>
                </label>
                <div className="relative">
                  <select
                    value={cancelReason}
                    onChange={(e) => { setCancelReason(e.target.value); setCancelCustom(""); }}
                    className="w-full px-4 py-2.5 text-sm rounded-xl outline-none appearance-none"
                    style={{
                      background: "var(--surface-container-low)",
                      color: cancelReason ? "var(--on-surface)" : "var(--outline)",
                      border: `2px solid ${cancelReason ? "var(--primary)" : "transparent"}`,
                    }}
                  >
                    <option value="" disabled>Select a reason…</option>
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4L6 8L10 4" stroke="var(--on-surface-variant)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Custom reason textarea (only when "Other" selected) */}
              {cancelReason === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Please describe the reason <span style={{ color: "#f44336" }}>*</span>
                  </label>
                  <textarea
                    value={cancelCustom}
                    onChange={(e) => setCancelCustom(e.target.value)}
                    rows={3}
                    placeholder="Type your reason here…"
                    className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                    style={{
                      background: "var(--surface-container-low)",
                      color: "var(--on-surface)",
                      border: `2px solid ${cancelCustom.trim() ? "var(--primary)" : "var(--outline-variant)"}`,
                    }}
                  />
                </div>
              )}

              {/* Preview of message to be sent */}
              {cancelReasonFinal && (
                <div className="p-3 rounded-xl text-xs"
                  style={{ background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}>
                  <p className="font-semibold mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    Message preview:
                  </p>
                  <p className="leading-relaxed" style={{ color: "var(--on-surface)" }}>
                    Hi <strong>{cancelTarget.name}</strong>, your appointment for <em>{cancelTarget.service}</em> has been canceled.
                    Reason: <em>{cancelReasonFinal}</em>.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  disabled={!canSubmitCancel || canceling}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: "#f44336", color: "#fff" }}
                >
                  {canceling
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />}
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ New Booking Modal ══ */}
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
            <h3 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>New Booking</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { label: "Customer Name",    key: "customer_name",  type: "text",           required: true  },
                { label: "Phone Number",     key: "customer_phone", type: "tel",            required: true  },
                { label: "Service",          key: "service",        type: "text",           required: true  },
                { label: "Date & Time",      key: "scheduled_at",   type: "datetime-local", required: true  },
                { label: "Notes (optional)", key: "notes",          type: "text",           required: false },
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
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
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
