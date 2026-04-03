"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Users, Plus, Trash2, Loader2, X, Save, AlertTriangle,
  Mail, Lock, User, FileText, Eye, EyeOff,
  ShieldCheck, Info, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, XCircle, CheckCircle2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SubUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  is_active: boolean;
  created_at: string;
}

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

// ── Calendar helpers ──────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_CFG = {
  pending:   { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8", label: "Pending",   icon: Clock        },
  confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#16a34a", label: "Confirmed", icon: CheckCircle  },
  canceled:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", label: "Canceled",  icon: XCircle      },
  completed: { bg: "rgba(34,197,94,0.15)",   color: "#15803d", label: "Completed", icon: CheckCircle2 },
  overdue:   { bg: "rgba(249,115,22,0.15)",  color: "#ea580c", label: "Overdue",   icon: AlertTriangle},
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}
function isoDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function getOverdueDays(scheduledAt: string): number {
  const s = new Date(scheduledAt); s.setHours(0, 0, 0, 0);
  const t = new Date();            t.setHours(0, 0, 0, 0);
  const d = Math.floor((t.getTime() - s.getTime()) / 86400000);
  return d > 0 ? d : 0;
}
function statusColor(status: string) {
  if (status === "confirmed") return "#16a34a";
  if (status === "pending")   return "#1d4ed8";
  if (status === "completed") return "#15803d";
  if (status === "overdue")   return "#ea580c";
  return "#dc2626";
}

type CalCell = { day: number; month: number; year: number; current: boolean };
function buildCalendarCells(year: number, month: number): CalCell[] {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: CalCell[] = [];
  const pm = month === 0 ? 11 : month - 1;
  const py = month === 0 ? year - 1 : year;
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, month: pm, year: py, current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month, year, current: true });
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  let n = 1;
  while (cells.length < 42)
    cells.push({ day: n++, month: nm, year: ny, current: false });
  return cells;
}

// ── Staff Calendar Modal ──────────────────────────────────────────────────────
function StaffCalendarModal({ user, onClose }: { user: SubUser; onClose: () => void }) {
  const today = new Date();
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mounted,      setMounted]      = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: appointments = [], isLoading } = useSWR<Appointment[]>(
    `/api/appointments?assigned_to=${user.id}`,
    fetcher,
    { refreshInterval: 30000 }
  );

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

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--surface-container-lowest)", boxShadow: "0px 32px 64px rgba(20,29,36,0.28)" }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}
            >
              {initials}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                {user.name}&rsquo;s Calendar
              </p>
              <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} assigned
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          ) : (
            <>
              {/* Calendar grid */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--outline-variant)" }}
              >
                {/* Month navigation */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-low)" }}
                >
                  <button
                    onClick={prevMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                      {MONTHS[calMonth]} {calYear}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                      {thisMonthCount} appointment{thisMonthCount !== 1 ? "s" : ""} this month
                    </p>
                  </div>
                  <button
                    onClick={nextMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-2 text-center text-[10px] font-semibold"
                      style={{ color: "var(--on-surface-variant)" }}>{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calendarCells.map((cell, i) => {
                    const key       = isoDateKey(cell.year, cell.month, cell.day);
                    const cellAppts = apptsByDate[key] ?? [];
                    const isToday   = cell.current
                      && cell.day === today.getDate()
                      && cell.month === today.getMonth()
                      && cell.year === today.getFullYear();
                    const isSelected = selectedDate === key && cell.current;
                    return (
                      <div
                        key={i}
                        onClick={() => cell.current && setSelectedDate(isSelected ? null : key)}
                        className="min-h-[80px] p-1.5 transition-colors"
                        style={{
                          borderRight:     i % 7 !== 6 ? "1px solid var(--outline-variant)" : undefined,
                          borderBottom:    i < 35       ? "1px solid var(--outline-variant)" : undefined,
                          backgroundColor: isSelected   ? "var(--primary-container)" : "transparent",
                          cursor:          cell.current ? "pointer" : "default",
                          opacity:         cell.current ? 1 : 0.3,
                        }}
                      >
                        <div className="flex justify-center mb-1">
                          <span
                            className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                            style={{
                              backgroundColor: isToday ? "var(--primary)" : "transparent",
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
                          {cellAppts.slice(0, 2).map((appt) => {
                            const ds = (mounted && appt.status === "confirmed" && getOverdueDays(appt.scheduled_at) > 0)
                              ? "overdue" : appt.status;
                            const dot = statusColor(ds);
                            return (
                              <div key={appt.id}
                                className="flex items-center gap-1 px-1 py-0.5 rounded truncate"
                                style={{ backgroundColor: `${dot}22` }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                                <span className="truncate font-medium"
                                  style={{ color: dot, fontSize: "9px", lineHeight: "1.4" }}>
                                  {fmtTime(appt.scheduled_at)} {appt.customer_name.split(" ")[0]}
                                </span>
                              </div>
                            );
                          })}
                          {cellAppts.length > 2 && (
                            <p className="pl-1 font-medium" style={{ color: "var(--on-surface-variant)", fontSize: "9px" }}>
                              +{cellAppts.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 px-1 flex-wrap">
                {[
                  { label: "Confirmed", color: "#16a34a" },
                  { label: "Pending",   color: "#1d4ed8" },
                  { label: "Canceled",  color: "#dc2626" },
                  { label: "Completed", color: "#15803d" },
                  { label: "Overdue",   color: "#ea580c" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--on-surface-variant)" }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>

              {/* Selected day panel */}
              {selectedDate && (
                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}
                >
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "long", month: "long", day: "numeric",
                        })}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                        {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {/* Status counts */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(["confirmed","pending","canceled","completed"] as const).map((s) => {
                        const count = selectedDayAppts.filter((a) => a.status === s).length;
                        if (!count) return null;
                        const cfg = STATUS_CFG[s];
                        return (
                          <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            {count} {s}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDayAppts.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--on-surface-variant)" }}>
                      No appointments on this day.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayAppts.map((appt) => {
                        const overdueDays   = (mounted && appt.status === "confirmed") ? getOverdueDays(appt.scheduled_at) : 0;
                        const displayStatus = overdueDays > 0 ? "overdue" : appt.status;
                        const cfg           = STATUS_CFG[displayStatus] ?? STATUS_CFG.confirmed;
                        const Icon          = cfg.icon;
                        return (
                          <div key={appt.id}
                            className="rounded-xl overflow-hidden"
                            style={{ backgroundColor: "var(--surface-container-lowest)" }}
                          >
                            {/* Status strip */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5"
                              style={{ backgroundColor: cfg.bg, borderBottom: `1px solid ${cfg.color}22` }}>
                              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color }} />
                              <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                                {cfg.label}
                              </span>
                              {overdueDays > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>
                                  · Overdue by {overdueDays} day{overdueDays !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {/* Card body */}
                            <div className="p-3 flex items-start gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
                              >
                                {appt.customer_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                                  {appt.customer_name}
                                </p>
                                <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>
                                  {appt.service} · {fmtTime(appt.scheduled_at)}
                                </p>
                                {appt.notes && (
                                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--on-surface-variant)", opacity: 0.65 }}>
                                    {appt.notes}
                                  </p>
                                )}
                                {appt.cancel_reason && (
                                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                                    Reason: {appt.cancel_reason}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--on-surface-variant)" }}>
                                {fmtTime(appt.scheduled_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {appointments.length === 0 && !isLoading && (
                <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
                  style={{ border: "1.5px dashed var(--outline-variant)" }}>
                  <Calendar className="w-9 h-9" style={{ color: "var(--outline)" }} />
                  <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                    No appointments assigned to {user.name} yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SubUsersPage() {
  const [showCreate, setShowCreate]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SubUser | null>(null);
  const [saving, setSaving]               = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [showPwd, setShowPwd]             = useState(false);
  const [calendarUser, setCalendarUser]   = useState<SubUser | null>(null);

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio]           = useState("");

  const { data: rawSubUsers, mutate, isLoading } =
    useSWR<SubUser[]>("/api/staff-users", fetcher);
  const subUsers: SubUser[] = Array.isArray(rawSubUsers) ? rawSubUsers : [];

  function openCreate() {
    setName(""); setEmail(""); setPassword(""); setBio("");
    setShowPwd(false); setCreateError(null);
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    const res = await fetch("/api/staff-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, bio }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setShowCreate(false);
      await mutate();
    } else {
      setCreateError(data.error ?? "Failed to create sub user");
    }
  }

  async function handleDelete(user: SubUser) {
    setDeleteConfirm(null);
    setDeletingId(user.id);
    await fetch(`/api/staff-users/${user.id}`, { method: "DELETE" });
    mutate(subUsers.filter((u) => u.id !== user.id), { revalidate: false });
    setDeletingId(null);
  }

  return (
    <AppShell>
      <div className="space-y-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Sub Users</h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Create staff accounts. Each sub user can view their own appointments and details.
            </p>
          </div>
          <button onClick={openCreate}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start">
            <Plus className="w-4 h-4" />
            Add Sub User
          </button>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-3 p-4 rounded-2xl text-xs"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong>How sub users work:</strong> Sub users can log in at <strong>/staff/login</strong> with their email and password.
            They can only view their own dashboard and appointments. The AI agent will book appointments under a sub user&apos;s name
            when a customer requests a specific staff member. Sub users cannot make any changes.
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : subUsers.length === 0 ? (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
            <Users className="w-9 h-9" style={{ color: "var(--outline)" }} />
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              No sub users yet. Add your first staff member.
            </p>
            <button onClick={openCreate}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
              Add Sub User
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subUsers.map((u) => (
              <SubUserCard
                key={u.id}
                user={u}
                deleting={deletingId === u.id}
                onDelete={() => setDeleteConfirm(u)}
                onViewCalendar={() => setCalendarUser(u)}
              />
            ))}
          </div>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Staff Calendar Modal ══ */}
      {calendarUser && (
        <StaffCalendarModal
          user={calendarUser}
          onClose={() => setCalendarUser(null)}
        />
      )}

      {/* ══ Create Modal ══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
                  <User className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>New Sub User</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-5 space-y-4 rounded-b-2xl">
              {createError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: "var(--error-container)", color: "var(--error)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {createError}
                </div>
              )}
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Full Name <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Email <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Password <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required type={showPwd ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--on-surface-variant)" }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Bio / Role
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Senior stylist, specialises in colour treatments"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none resize-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm Modal ══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--error-container)" }}>
                <AlertTriangle className="w-6 h-6" style={{ color: "var(--error)" }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>Remove Sub User?</p>
                <p className="text-sm font-semibold mt-1" style={{ color: "var(--primary)" }}>{deleteConfirm.name}</p>
                <p className="text-sm mt-2" style={{ color: "var(--on-surface-variant)" }}>
                  This will permanently remove their account. Their past appointments will remain but will no longer be linked to them.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Keep
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--error)", color: "var(--on-error)" }}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Sub User Card ─────────────────────────────────────────────────────────────
function SubUserCard({ user, deleting, onDelete, onViewCalendar }: {
  user: SubUser;
  deleting: boolean;
  onDelete: () => void;
  onViewCalendar: () => void;
}) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const created = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.07)" }}>
      {/* Status strip */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{
          background: user.is_active ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.07)",
          borderBottom: `1px solid ${user.is_active ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.2)"}`,
        }}>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full${user.is_active ? " animate-pulse" : ""}`}
            style={{ background: user.is_active ? "#22c55e" : "#f59e0b" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: user.is_active ? "#16a34a" : "#92400e" }}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--outline)" }}>Joined {created}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{user.name}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--on-surface-variant)" }}>{user.email}</p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Calendar view button */}
            <button
              onClick={onViewCalendar}
              title="View calendar"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            {/* Delete button */}
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--error)" }} />
            ) : (
              <button onClick={onDelete}
                title="Remove sub user"
                className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all hover:opacity-80"
                style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {user.bio && (
          <p className="text-xs mt-2.5 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{user.bio}</p>
        )}

        {/* Staff login hint */}
        <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          Logs in at <strong className="ml-0.5">/staff/login</strong>
        </div>
      </div>
    </div>
  );
}
