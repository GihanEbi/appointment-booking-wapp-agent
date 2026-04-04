"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  UserCircle2, FileText, Upload, Trash2, Clock,
  CheckCircle, Bot,
  Plus, Pencil, X, AlertCircle, Save,
  AlertTriangle, Sparkles, ArrowRight,
  Building2, Tag, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight,
  MessageCircle, Send, RefreshCw,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import useSWR from "swr";
import clsx from "clsx";
import Link from "next/link";
import type { BusinessDetails, AvailabilitySlot, TrainingDoc, Service } from "@/types/database";

/* ── Types ─────────────────────────────────────────────────── */
type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

interface StaffUser { id: string; name: string; email: string; }

type SlotModalState =
  | { mode: "add" }
  | { mode: "edit"; slot: AvailabilitySlot };

const DAYS: { short: DayName; full: string }[] = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
];

const DAY_SHORT: Record<string, DayName> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const JS_DAY_IDX: DayName[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayDay: DayName = JS_DAY_IDX[new Date().getDay()];

const slotColors: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "var(--primary-container)",   text: "var(--on-primary-container)",   border: "var(--primary)"   },
  1: { bg: "var(--tertiary-container)",  text: "var(--on-tertiary-container)",  border: "var(--tertiary)"  },
  2: { bg: "var(--secondary-container)", text: "var(--on-secondary-container)", border: "var(--secondary)" },
};

/* ── Helpers ────────────────────────────────────────────────── */
const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data);

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/* ── Week Calendar ──────────────────────────────────────────── */
const CAL_START = 7;
const CAL_END   = 22;
const CAL_HOUR  = 48;
const MON_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getMonday(weekOffset: number): Date {
  const now = new Date();
  const dow = now.getDay();
  const d   = new Date(now);
  d.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function slotColorHash(id: string): number {
  return id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
}

function WeekCalendar({
  slots,
  weekOffset,
  onWeekChange,
  onAddSlot,
  onDeleteSlot,
}: {
  slots: AvailabilitySlot[];
  weekOffset: number;
  onWeekChange: (n: number) => void;
  onAddSlot: (dayFull: string) => void;
  onDeleteSlot: (slot: AvailabilitySlot) => void;
}) {
  const monday    = getMonday(weekOffset);
  const todayMid  = new Date(); todayMid.setHours(0,0,0,0);
  const hours     = Array.from({ length: CAL_END - CAL_START }, (_, i) => CAL_START + i);
  const totalH    = (CAL_END - CAL_START) * CAL_HOUR;

  const weekDates = DAYS.map(({ full }, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, full };
  });

  const from = weekDates[0].date;
  const to   = weekDates[6].date;
  const weekLabel = from.getMonth() === to.getMonth()
    ? `${MON_SHORT[from.getMonth()]} ${from.getDate()}–${to.getDate()}, ${from.getFullYear()}`
    : `${MON_SHORT[from.getMonth()]} ${from.getDate()} – ${MON_SHORT[to.getMonth()]} ${to.getDate()}, ${to.getFullYear()}`;

  return (
    <>
      {/* Week navigation + add button */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--outline-variant)" }}>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onWeekChange(weekOffset - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-1 min-w-[140px] text-center"
            style={{ color: "var(--on-surface)" }}>
            {weekLabel}
          </span>
          <button onClick={() => onWeekChange(weekOffset + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => onWeekChange(0)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1"
              style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
              Today
            </button>
          )}
        </div>
        <button onClick={() => onAddSlot("Monday")}
          className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl">
          <Plus className="w-3.5 h-3.5" /> Add Slot
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 520 }}>
          {/* Day headers */}
          <div className="flex" style={{ paddingLeft: 36, borderBottom: "1px solid var(--outline-variant)" }}>
            {weekDates.map(({ date, full }, i) => {
              const isToday = date.getTime() === todayMid.getTime();
              const isPast  = date < todayMid;
              const hasSl   = slots.some(s => s.day_of_week === full);
              return (
                <div key={full}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer transition-opacity hover:opacity-70"
                  style={{ borderLeft: i === 0 ? "none" : "1px solid var(--outline-variant)" }}
                  title={`Add slot for ${full}`}
                  onClick={() => onAddSlot(full)}>
                  <span className="text-[9px] font-bold uppercase tracking-wide"
                    style={{ color: isToday ? "#22c55e" : isPast ? "var(--outline)" : "var(--on-surface-variant)" }}>
                    {DAYS[i].short}
                  </span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      background: isToday ? "#22c55e" : "transparent",
                      color: isToday ? "#fff" : isPast ? "var(--outline)" : "var(--on-surface)",
                    }}>
                    {date.getDate()}
                  </div>
                  {hasSl && (
                    <div className="w-1 h-1 rounded-full"
                      style={{ background: isToday ? "#22c55e" : isPast ? "var(--outline-variant)" : "var(--primary)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: 440 }}>
            <div className="flex" style={{ height: totalH }}>
              {/* Hour labels */}
              <div className="flex-shrink-0 relative" style={{ width: 36, height: totalH }}>
                {hours.map((h) => (
                  <div key={h}
                    className="absolute text-[9px] text-right pr-1 leading-none select-none"
                    style={{ top: (h - CAL_START) * CAL_HOUR - 5, left: 0, right: 0, color: "var(--outline)" }}>
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map(({ date, full }, i) => {
                const isToday = date.getTime() === todayMid.getTime();
                const isPast  = date < todayMid;
                const colSlots = slots.filter(s => s.day_of_week === full);
                return (
                  <div key={full}
                    className="flex-1 relative cursor-pointer"
                    style={{
                      height: totalH,
                      borderLeft: "1px solid var(--outline-variant)",
                      background: isToday ? "rgba(34,197,94,0.04)" : "transparent",
                    }}
                    onClick={() => !isPast && onAddSlot(full)}>
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0"
                        style={{ top: (h - CAL_START) * CAL_HOUR, borderTop: "1px solid var(--outline-variant)" }} />
                    ))}
                    {/* Slot blocks */}
                    {colSlots.map((slot) => {
                      const sm = timeToMinutes(slot.start_time);
                      const em = timeToMinutes(slot.end_time);
                      const top = Math.max(0, ((sm - CAL_START * 60) / 60) * CAL_HOUR);
                      const ht  = Math.max(22, ((em - sm) / 60) * CAL_HOUR);
                      const c   = slotColors[slotColorHash(slot.id)];
                      return (
                        <div key={slot.id}
                          className="absolute left-0.5 right-0.5 rounded group cursor-pointer transition-opacity hover:opacity-80"
                          style={{ top, height: ht, background: c.bg, borderLeft: `2px solid ${c.border}`, opacity: isPast ? 0.45 : 1, overflow: "hidden" }}
                          onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot); }}
                          title={`${slot.label} ${slot.start_time}–${slot.end_time} · click to delete`}>
                          <div className="px-1 pt-0.5 flex items-start justify-between gap-0.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-[8px] font-bold truncate leading-tight" style={{ color: c.text }}>
                                {slot.label}
                              </p>
                              {ht > 28 && (
                                <p className="text-[7px] leading-tight opacity-80" style={{ color: c.border }}>
                                  {slot.start_time}–{slot.end_time}
                                </p>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-opacity"
                              style={{ background: "rgba(255,255,255,0.6)" }}>
                              <X className="w-2 h-2" style={{ color: c.border }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2.5 text-[10px] flex-wrap"
            style={{ borderTop: "1px solid var(--outline-variant)", color: "var(--on-surface-variant)" }}>
            {/* Today */}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
              Today
            </span>
            {/* Past */}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-3 rounded flex-shrink-0" style={{ background: "var(--surface-container-high)", opacity: 0.45, border: "1px solid var(--outline-variant)" }} />
              Past (read-only)
            </span>
            {/* Slot colors */}
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded flex-shrink-0" style={{ background: "var(--primary-container)", borderLeft: "2px solid var(--primary)" }} />
              <span className="inline-block w-3 h-3 rounded flex-shrink-0" style={{ background: "var(--tertiary-container)", borderLeft: "2px solid var(--tertiary)" }} />
              <span className="inline-block w-3 h-3 rounded flex-shrink-0 mr-1" style={{ background: "var(--secondary-container)", borderLeft: "2px solid var(--secondary)" }} />
              Availability slots
            </span>
            {/* Dot */}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
              Has slots
            </span>
            <span className="ml-auto opacity-70">
              Click column to add · click block to delete
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── TimePicker ─────────────────────────────────────────────── */
const PICKER_HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const PICKER_MINS  = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const hourRef   = useRef<HTMLDivElement>(null);
  const minRef    = useRef<HTMLDivElement>(null);

  const [selH, selM] = value ? value.split(":") : ["", ""];

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* scroll selected item into view when opening */
  useEffect(() => {
    if (!open) return;
    if (selH) {
      hourRef.current?.querySelector(`[data-h="${selH}"]`)?.scrollIntoView({ block: "center" });
    }
    if (selM) {
      minRef.current?.querySelector(`[data-m="${selM}"]`)?.scrollIntoView({ block: "center" });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickHour(h: string) { onChange(`${h}:${selM || "00"}`); }
  function pickMin(m: string)  { onChange(`${selH || "00"}:${m}`); setOpen(false); }

  /* 12-hour display */
  const display = (() => {
    if (!selH || !selM) return null;
    const h = parseInt(selH, 10);
    return {
      label: `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${selM}`,
      ampm: h < 12 ? "AM" : "PM",
    };
  })();

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
        style={{
          background: "var(--surface-container-low)",
          border: `2px solid ${open ? "var(--primary)" : "transparent"}`,
        }}
      >
        {display ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>{display.label}</span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--primary)" }}>{display.ampm}</span>
          </span>
        ) : (
          <span className="text-sm" style={{ color: "var(--outline)" }}>{placeholder}</span>
        )}
        <Clock
          className="w-4 h-4 flex-shrink-0 transition-colors"
          style={{ color: open ? "var(--primary)" : "var(--on-surface-variant)" }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-[60]"
          style={{
            background: "var(--surface-container-lowest)",
            boxShadow: "0px 16px 40px rgba(20,29,36,0.18)",
            border: "1px solid var(--outline-variant)",
          }}
        >
          {/* Column headers */}
          <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-center py-2.5"
              style={{ color: "var(--outline)", borderRight: "1px solid var(--outline-variant)" }}>
              Hour
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-center py-2.5"
              style={{ color: "var(--outline)" }}>
              Minute
            </p>
          </div>

          <div className="grid grid-cols-2">
            {/* Hours */}
            <div
              ref={hourRef}
              className="overflow-y-auto py-1"
              style={{ maxHeight: 192, borderRight: "1px solid var(--outline-variant)" }}
            >
              {PICKER_HOURS.map((h) => {
                const hr  = parseInt(h, 10);
                const lbl = hr === 0 ? "12" : hr > 12 ? (hr - 12).toString() : hr.toString();
                const ap  = hr < 12 ? "am" : "pm";
                const sel = selH === h;
                return (
                  <button
                    key={h}
                    data-h={h}
                    type="button"
                    onClick={() => pickHour(h)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-sm transition-all"
                    style={{
                      background:  sel ? "var(--primary-container)"    : "transparent",
                      color:       sel ? "var(--on-primary-container)" : "var(--on-surface)",
                      fontWeight:  sel ? 700 : 400,
                    }}
                  >
                    <span>{lbl}</span>
                    <span
                      className="text-[9px] font-bold uppercase"
                      style={{ color: sel ? "var(--primary)" : "var(--outline)" }}
                    >
                      {ap}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Minutes */}
            <div ref={minRef} className="overflow-y-auto py-1" style={{ maxHeight: 192 }}>
              {PICKER_MINS.map((m) => {
                const sel = selM === m;
                return (
                  <button
                    key={m}
                    data-m={m}
                    type="button"
                    onClick={() => pickMin(m)}
                    className="w-full text-center px-3.5 py-2 text-sm transition-all"
                    style={{
                      background: sel ? "var(--primary-container)"    : "transparent",
                      color:      sel ? "var(--on-primary-container)" : "var(--on-surface)",
                      fontWeight: sel ? 700 : 400,
                    }}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────── */
export default function MyDetailsPage() {
  /* ── Remote data ── */
  const profileFetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: profileRes, mutate: mutateProfile } = useSWR<{ data: { onboarding_completed: boolean; business_name: string } | null }>(
    "/api/profile", profileFetcher, { revalidateOnFocus: false }
  );
  // default to `true` until loaded — avoids flashing banner on first render
  const onboardingDone  = profileRes === undefined ? true : (profileRes?.data?.onboarding_completed ?? false);
  const hasStarted      = !!(profileRes?.data?.business_name);

  const { data: bizData, mutate: mutateBiz } = useSWR<BusinessDetails | null>("/api/business", fetcher);
  const { data: docs = [], mutate: mutateDocs }   = useSWR<TrainingDoc[]>("/api/training-docs", fetcher, { fallbackData: [] });
  const { data: slots = [], mutate: mutateSlots } = useSWR<AvailabilitySlot[]>("/api/slots", fetcher, { fallbackData: [] });
  const { data: staffUsers = [] } = useSWR<StaffUser[]>("/api/staff-users", profileFetcher, { fallbackData: [] });
  const servicesFetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data ?? []);
  const { data: services = [], mutate: mutateServices } = useSWR<Service[]>("/api/services", servicesFetcher, { fallbackData: [] });

  /* ── Agent settings (synced from bizData) ── */
  const [autoConfirm,    setAutoConfirm]    = useState(false);
  const [allowStaffPick, setAllowStaffPick] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  useEffect(() => {
    if (bizData) {
      setAutoConfirm(bizData.auto_confirm ?? false);
      setAllowStaffPick(bizData.allow_staff_pick ?? true);
    }
  }, [bizData]);

  async function saveAgentSettings(field: "auto_confirm" | "allow_staff_pick", value: boolean) {
    setSavingSettings(true);
    await fetch("/api/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await mutateBiz();
    setSavingSettings(false);
  }

  /* ── Business Identity modal ── */
  const CATEGORIES = [
    "Beauty", "Spa & Salon", "Clothing & Apparel", "Education", "Entertainment",
    "Event Planning & Services", "Hotel & Lodging", "Medical & Health",
    "Professional Services", "Travel & Transport", "Other",
  ];
  const [bizModal, setBizModal] = useState(false);
  const [draftBizName, setDraftBizName]     = useState("");
  const [draftCategory, setDraftCategory]   = useState("");
  const [draftCatOther, setDraftCatOther]   = useState("");
  const [savingBiz, setSavingBiz]           = useState(false);

  function openBizModal() {
    setDraftBizName(profileRes?.data?.business_name ?? "");
    setDraftCategory(bizData?.category ?? "");
    setDraftCatOther(bizData?.category_other ?? "");
    setBizModal(true);
  }

  async function saveBizIdentity() {
    if (!draftBizName.trim()) return;
    setSavingBiz(true);
    await Promise.all([
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: draftBizName.trim() }),
      }),
      fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draftCategory,
          category_other: draftCategory === "Other" ? draftCatOther.trim() : null,
        }),
      }),
    ]);
    await Promise.all([mutateBiz(), mutateProfile()]);
    setSavingBiz(false);
    setBizModal(false);
  }

  /* ── Inline add-service form ── */
  const [newSvcName,  setNewSvcName]  = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [addingSvc,   setAddingSvc]   = useState(false);

  async function handleAddService() {
    if (!newSvcName.trim()) return;
    setAddingSvc(true);
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSvcName.trim(), price: newSvcPrice.trim() || null }),
    });
    await mutateServices();
    setNewSvcName(""); setNewSvcPrice("");
    setAddingSvc(false);
  }

  async function handleDeleteService(id: string) {
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    mutateServices((prev = []) => prev.filter((s) => s.id !== id), false);
  }

  /* ── Description editing ── */
  const description = bizData?.description ?? "";
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  async function handleSaveDescription() {
    setSavingDesc(true);
    await fetch("/api/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: draftDescription }),
    });
    await mutateBiz();
    setSavingDesc(false);
    setEditingDescription(false);
  }

  /* ── Training docs upload ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/training-docs", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      setUploadError(json.error ?? "Upload failed");
    } else {
      await mutateDocs();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteDoc(id: string) {
    await fetch(`/api/training-docs/${id}`, { method: "DELETE" });
    mutateDocs((prev = []) => prev.filter((d) => d.id !== id), false);
  }

  /* ── Calendar week offset ── */
  const [weekOffset, setWeekOffset] = useState(0);

  /* ── Slot modal (add & edit) ── */
  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  const [slotForm, setSlotForm] = useState({ label: "", day_of_week: "Monday", start_time: "", end_time: "" });
  const [submittingSlot, setSubmittingSlot] = useState(false);

  function openAddSlot(dayFull = "Monday") {
    setSlotForm({ label: "", day_of_week: dayFull, start_time: "", end_time: "" });
    setSlotModal({ mode: "add" });
  }

  function openEditSlot(slot: AvailabilitySlot) {
    setSlotForm({ label: slot.label, day_of_week: slot.day_of_week, start_time: slot.start_time, end_time: slot.end_time });
    setSlotModal({ mode: "edit", slot });
  }

  function closeSlotModal() {
    setSlotModal(null);
  }

  async function handleSlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotModal) return;
    setSubmittingSlot(true);

    if (slotModal.mode === "add") {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotForm),
      });
      if (res.ok) {
        await mutateSlots();
        closeSlotModal();
      }
    } else {
      await fetch(`/api/slots/${slotModal.slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: slotForm.label,
          start_time: slotForm.start_time,
          end_time: slotForm.end_time,
        }),
      });
      await mutateSlots();
      closeSlotModal();
    }

    setSubmittingSlot(false);
  }

  /* ── Delete confirmation ── */
  const [deleteConfirm, setDeleteConfirm] = useState<AvailabilitySlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState(false);

  async function confirmDeleteSlot() {
    if (!deleteConfirm) return;
    setDeletingSlot(true);
    await fetch(`/api/slots/${deleteConfirm.id}`, { method: "DELETE" });
    mutateSlots((prev = []) => prev.filter((s) => s.id !== deleteConfirm.id), false);
    setDeletingSlot(false);
    setDeleteConfirm(null);
  }

  /* ── Test AI chat ── */
  type ChatMsg = { role: "user" | "assistant"; content: string };
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatOpen]);

  async function sendChatMessage() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const next: ChatMsg[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/test-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: chatHistory }),
      });
      const json = await res.json();
      setChatHistory([...next, { role: "assistant", content: json.reply ?? "No response." }]);
    } catch {
      setChatHistory([...next, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setChatLoading(false);
  }

  return (
    <AppShell>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>My Details</h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Service information and availability settings for your AI booking agent.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {onboardingDone && (
              <button
                onClick={() => { setChatOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 btn-primary">
                <MessageCircle className="w-4 h-4" />
                Test AI Agent
              </button>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
              style={{ background: "var(--surface-container-low)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-none" style={{ color: "var(--on-surface)" }}>AI Status</p>
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--primary)" }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Learning from latest updates…
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onboarding banner (always shown until completed) ── */}
        {!onboardingDone && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", boxShadow: "0px 12px 32px rgba(20,29,36,0.15)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 px-6 py-5">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Sparkles className="w-7 h-7 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-white">
                  {hasStarted ? "Complete your setup" : "Set up your AI Booking Agent"}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {hasStarted
                    ? "You started the setup but haven't finished. Pick up where you left off to activate your AI agent."
                    : "Add your business details, services, availability, and configure how the AI handles bookings — takes about 5 minutes."}
                </p>
                {/* Step indicators */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {[
                    { label: "Business Identity",  done: hasStarted },
                    { label: "Services",           done: !!(bizData?.description) },
                    { label: "Schedule",           done: slots.length > 0 },
                    { label: "Agent Settings",     done: false },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: done ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
                      >
                        {done
                          ? <CheckCircle className="w-3 h-3" style={{ color: "var(--primary)" }} />
                          : <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: done ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.6)" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA button */}
              <Link
                href="/onboarding"
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold flex-shrink-0 transition-all hover:scale-105"
                style={{ backgroundColor: "rgba(255,255,255,0.95)", color: "var(--primary)" }}
              >
                {hasStarted ? "Continue Setup" : "Start Setup"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── New-user overview cards (shown only before onboarding is done) ── */}
        {!onboardingDone && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
              What you&apos;ll configure
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Building2,   title: "Business Identity",  desc: "Your name, category, and brand",          done: hasStarted },
                { icon: FileText,    title: "Services & Pricing", desc: "What you offer and what it costs",         done: !!(bizData?.description) || services.length > 0 },
                { icon: Clock,       title: "Availability",       desc: "When customers can book with you",         done: slots.length > 0 },
                { icon: Bot,         title: "Agent Settings",     desc: "How your AI handles bookings",             done: false },
              ].map(({ icon: Icon, title, desc, done }) => (
                <div key={title}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    backgroundColor: done ? "var(--primary-container)" : "var(--surface-container-lowest)",
                    border: `1.5px solid ${done ? "var(--primary)" : "var(--outline-variant)"}`,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: done ? "var(--primary)" : "var(--surface-container-low)" }}>
                    <Icon className="w-5 h-5" style={{ color: done ? "var(--on-primary)" : "var(--on-surface-variant)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: done ? "var(--primary)" : "var(--on-surface)" }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>{desc}</p>
                  </div>
                  {done && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary)" }} />}
                </div>
              ))}
            </div>
            <p className="text-xs text-center py-2" style={{ color: "var(--outline)" }}>
              Click &quot;{hasStarted ? "Continue Setup" : "Start Setup"}&quot; above to configure your AI agent.
            </p>
          </div>
        )}

        {/* ══ Full details — only shown after onboarding is complete ══ */}
        {onboardingDone && <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ─── LEFT: Service Information ─── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
                <UserCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Service Information</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Manage how your AI concierge describes and sells your services.
                </p>
              </div>
            </div>

            {/* Business Identity */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Business Identity</p>
                <button
                  onClick={openBizModal}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Business Name</p>
                    <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                      {profileRes?.data?.business_name || "—"}
                    </p>
                  </div>
                </div>
                {bizData?.category && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--secondary-container)", color: "var(--on-secondary-container)" }}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Category</p>
                      <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                        {bizData.category === "other" ? (bizData.category_other || "Other") : bizData.category}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Service Description */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Service Description</p>
                {!editingDescription ? (
                  <button
                    onClick={() => { setDraftDescription(description); setEditingDescription(true); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                    style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingDescription(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                      style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleSaveDescription} disabled={savingDesc}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg btn-primary disabled:opacity-60">
                      {savingDesc
                        ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5">
                {editingDescription ? (
                  <textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)}
                    rows={5}
                    className="w-full text-sm leading-relaxed rounded-xl px-4 py-3 outline-none resize-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid var(--primary)" }} />
                ) : bizData === undefined ? (
                  <div className="h-20 rounded-xl animate-pulse" style={{ background: "var(--surface-container-low)" }} />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                    {description || "No description yet. Click Edit to add one."}
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: "var(--outline)" }}>
                  This text is used by your AI agent to describe services to clients on WhatsApp.
                </p>
              </div>
            </div>

            {/* Training Documents */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Training Documents</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Upload PDFs, brochures, or price lists for the AI to analyze.
                  </p>
                </div>
                <label className={clsx(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105",
                  uploading && "opacity-60 pointer-events-none"
                )} style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}>
                  {uploading
                    ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading…" : "Upload"}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx"
                    className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <div className="px-5 pt-4">
                {uploadError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs"
                    style={{ background: "var(--error-container)", color: "var(--error)" }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
                <div onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl py-6 border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary)]"
                  style={{ borderColor: "var(--outline-variant)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--surface-container-high)" }}>
                    <Upload className="w-5 h-5" style={{ color: "var(--on-surface-variant)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--on-surface)" }}>
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                    PDF, DOC, DOCX · Max 10 MB per file
                  </p>
                </div>
              </div>
              <div className="px-5 pt-4 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--on-surface-variant)" }}>Active Documents</p>
                {docs.length === 0 && !uploading ? (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--outline)" }}>
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-xl group transition-all hover:scale-[1.005]"
                        style={{ background: "var(--surface-container-low)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                            {doc.file_name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                            {formatFileSize(doc.file_size)} · Uploaded {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ background: "var(--surface-container-highest)", color: "var(--on-surface-variant)" }}>
                            {doc.file_name.split(".").pop()?.toUpperCase()}
                          </span>
                          <button onClick={() => handleDeleteDoc(doc.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            style={{ background: "var(--error-container)", color: "var(--error)" }}
                            aria-label="Delete document">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sub-services */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Sub-services</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Services your AI can offer and quote to customers
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {services.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--outline)" }}>
                    No services added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {services.map((svc) => (
                      <div key={svc.id}
                        className="group flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{ background: "var(--surface-container-low)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--on-surface)" }}>{svc.name}</p>
                          {svc.price && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>{svc.price}</p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteService(svc.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                          style={{ background: "var(--error-container)", color: "var(--error)" }}
                          aria-label="Delete service">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <input
                    value={newSvcName}
                    onChange={(e) => setNewSvcName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddService()}
                    placeholder="Service name…"
                    className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                  <input
                    value={newSvcPrice}
                    onChange={(e) => setNewSvcPrice(e.target.value)}
                    placeholder="Price…"
                    className="w-24 px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                  <button onClick={handleAddService} disabled={addingSvc || !newSvcName.trim()}
                    className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60">
                    {addingSvc
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Plus className="w-3.5 h-3.5" />}
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Availability Management ─── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--secondary), var(--secondary-container))" }}>
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Availability Management</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Set the time windows when your AI can confirm appointments.
                </p>
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <Clock className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Availability Calendar</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Weekly recurring slots · click a column to add, click a block to delete
                  </p>
                </div>
              </div>

              <WeekCalendar
                slots={slots}
                weekOffset={weekOffset}
                onWeekChange={setWeekOffset}
                onAddSlot={openAddSlot}
                onDeleteSlot={(slot) => setDeleteConfirm(slot)}
              />
            </div>

            {/* Agent Settings */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Agent Settings</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                  Control how your AI handles booking confirmations
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Auto-confirm bookings</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                      Automatically confirm appointments without manual review
                    </p>
                  </div>
                  <button
                    onClick={() => { const next = !autoConfirm; setAutoConfirm(next); saveAgentSettings("auto_confirm", next); }}
                    disabled={savingSettings}
                    className="flex-shrink-0 disabled:opacity-60 transition-all hover:scale-105"
                    aria-label="Toggle auto-confirm">
                    {autoConfirm
                      ? <ToggleRight className="w-8 h-8" style={{ color: "var(--primary)" }} />
                      : <ToggleLeft  className="w-8 h-8" style={{ color: "var(--outline)" }} />}
                  </button>
                </div>
                <div style={{ height: 1, background: "var(--outline-variant)" }} />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Allow staff selection</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                      Let customers choose which staff member they prefer
                    </p>
                  </div>
                  <button
                    onClick={() => { const next = !allowStaffPick; setAllowStaffPick(next); saveAgentSettings("allow_staff_pick", next); }}
                    disabled={savingSettings}
                    className="flex-shrink-0 disabled:opacity-60 transition-all hover:scale-105"
                    aria-label="Toggle staff pick">
                    {allowStaffPick
                      ? <ToggleRight className="w-8 h-8" style={{ color: "var(--primary)" }} />
                      : <ToggleLeft  className="w-8 h-8" style={{ color: "var(--outline)" }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* AI learning notice */}
            <div className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--on-primary-container))" }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">AI is Syncing</p>
                <p className="text-xs mt-1 leading-relaxed opacity-80">
                  Your AI agent is re-learning from the latest documents and schedule changes. This usually takes 1–2 minutes.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span className="text-xs font-semibold">Learning from latest updates…</span>
                </div>
              </div>
            </div>
          </div>
        </div>}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Business Identity Modal ══ */}
      {bizModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setBizModal(false)}>
          <div className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Edit Business Identity</p>
              </div>
              <button onClick={() => setBizModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Business name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Business Name
                </label>
                <input
                  value={draftBizName}
                  onChange={(e) => setDraftBizName(e.target.value)}
                  placeholder="e.g. Luxe Hair Studio"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Category
                </label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none appearance-none"
                  style={{ background: "var(--surface-container-low)", color: draftCategory ? "var(--on-surface)" : "var(--outline)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}>
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Other category text */}
              {draftCategory === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Specify Category
                  </label>
                  <input
                    value={draftCatOther}
                    onChange={(e) => setDraftCatOther(e.target.value)}
                    placeholder="Describe your business type…"
                    className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setBizModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button
                  onClick={saveBizIdentity}
                  disabled={savingBiz || !draftBizName.trim()}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingBiz
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Add / Edit Slot Modal ══ */}
      {slotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && closeSlotModal()}
        >
          <div className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: slotModal.mode === "edit"
                      ? "var(--secondary-container)"
                      : "var(--primary-container)",
                    color: slotModal.mode === "edit"
                      ? "var(--secondary)"
                      : "var(--primary)",
                  }}>
                  {slotModal.mode === "edit" ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  {slotModal.mode === "edit" ? "Edit Time Slot" : "Add Time Slot"}
                </p>
              </div>
              <button onClick={closeSlotModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSlotSubmit} className="p-5 space-y-4 rounded-b-2xl">
              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Slot Label
                </label>
                <input
                  required
                  value={slotForm.label}
                  onChange={(e) => setSlotForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Morning Session"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              {/* Day of week — disabled in edit mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Day of Week
                </label>
                <select
                  required
                  disabled={slotModal.mode === "edit"}
                  value={slotForm.day_of_week}
                  onChange={(e) => setSlotForm((p) => ({ ...p, day_of_week: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none appearance-none disabled:opacity-60"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                >
                  {DAYS.map((d) => (
                    <option key={d.full} value={d.full}>{d.full}</option>
                  ))}
                </select>
                {slotModal.mode === "edit" && (
                  <p className="text-[10px]" style={{ color: "var(--outline)" }}>
                    To change the day, delete this slot and create a new one.
                  </p>
                )}
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Start Time
                  </label>
                  <TimePicker
                    value={slotForm.start_time}
                    onChange={(v) => setSlotForm((p) => ({ ...p, start_time: v }))}
                    placeholder="Start"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    End Time
                  </label>
                  <TimePicker
                    value={slotForm.end_time}
                    onChange={(v) => setSlotForm((p) => ({ ...p, end_time: v }))}
                    placeholder="End"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeSlotModal}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSlot || !slotForm.start_time || !slotForm.end_time}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {submittingSlot
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : slotModal.mode === "edit"
                      ? <Save className="w-4 h-4" />
                      : <Plus className="w-4 h-4" />}
                  {slotModal.mode === "edit" ? "Save Changes" : "Add Slot"}
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
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            {/* Warning header */}
            <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--error-container)" }}>
                <AlertTriangle className="w-7 h-7" style={{ color: "var(--error)" }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>Delete Time Slot?</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                  You are about to delete
                </p>
              </div>
            </div>

            {/* Slot preview */}
            <div className="mx-5 mb-4 p-3 rounded-xl flex items-center gap-3"
              style={{ background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--error-container)" }}>
                <Clock className="w-4 h-4" style={{ color: "var(--error)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--on-surface)" }}>
                  {deleteConfirm.label}
                </p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  {deleteConfirm.day_of_week} · {deleteConfirm.start_time} – {deleteConfirm.end_time}
                </p>
              </div>
            </div>

            {/* Notice */}
            <div className="mx-5 mb-5 flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#a16207" }} />
              <p style={{ color: "#a16207" }}>
                This will not affect any already booked appointments. Only future booking availability will change.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                Keep Slot
              </button>
              <button
                onClick={confirmDeleteSlot}
                disabled={deletingSlot}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--error)", color: "var(--on-error)" }}>
                {deletingSlot
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Test AI Agent Chat Popup ══ */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setChatOpen(false)}>
          <div className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface-container-lowest)",
              boxShadow: "0px 24px 64px rgba(20,29,36,0.25)",
              height: "min(90vh, 600px)",
            }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--outline-variant)", background: "var(--surface-container-low)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Test AI Agent</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: "var(--primary)" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Responding as your WhatsApp bot
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatHistory([])}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                  style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                  title="Clear chat">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setChatOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--primary-container)" }}>
                    <MessageCircle className="w-7 h-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: "var(--on-surface)" }}>
                    Ask your AI agent anything
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                    Try: "What services do you offer?", "When are you available?", or "How do I book an appointment?"
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {["What services do you offer?", "When are you available?", "How do I book?"].map((s) => (
                      <button key={s} onClick={() => setChatInput(s)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                        style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === "user"
                      ? { background: "var(--primary)", color: "var(--on-primary)", borderBottomRightRadius: 4 }
                      : { background: "var(--surface-container-low)", color: "var(--on-surface)", borderBottomLeftRadius: 4 }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                    style={{ background: "var(--surface-container-low)", borderBottomLeftRadius: 4 }}>
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "var(--on-surface-variant)", animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2"
              style={{ borderTop: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  placeholder="Type a message…"
                  disabled={chatLoading}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{
                    background: "var(--surface-container-low)",
                    color: "var(--on-surface)",
                    border: "2px solid transparent",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl btn-primary disabled:opacity-50 transition-all hover:scale-105 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: "var(--outline)" }}>
                Test mode — no appointments will be created
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
