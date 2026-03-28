"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  UserCircle2, FileText, Upload, Trash2, Clock,
  CheckCircle, Bot,
  Plus, Pencil, X, AlertCircle, LayoutGrid, Table2, Save,
  AlertTriangle,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import useSWR from "swr";
import clsx from "clsx";
import type { BusinessDetails, AvailabilitySlot, TrainingDoc } from "@/types/database";

/* ── Types ─────────────────────────────────────────────────── */
type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

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

/* ── Timetable View ─────────────────────────────────────────── */
const TT_START = 7;
const TT_END = 22;
const HOUR_H = 44;

function TimetableView({ slots }: { slots: AvailabilitySlot[] }) {
  const hours = Array.from({ length: TT_END - TT_START }, (_, i) => TT_START + i);
  const totalH = (TT_END - TT_START) * HOUR_H;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth: 460 }}>
        <div className="flex pl-10 pb-1">
          {DAYS.map(({ short }) => (
            <div key={short} className="flex-1 flex flex-col items-center gap-0.5 py-1">
              <span
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: short === todayDay ? "#22c55e" : "var(--on-surface-variant)" }}
              >
                {short}
              </span>
              {short === todayDay && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              )}
            </div>
          ))}
        </div>

        <div className="flex" style={{ height: totalH }}>
          <div className="relative flex-shrink-0" style={{ width: 40, height: totalH }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute text-[9px] text-right pr-1.5 leading-none select-none"
                style={{ top: (h - TT_START) * HOUR_H - 5, left: 0, right: 0, color: "var(--outline)" }}
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {DAYS.map(({ short, full }) => {
            const daySlots = slots.filter((s) => s.day_of_week === full);
            return (
              <div
                key={short}
                className="flex-1 relative"
                style={{ borderLeft: "1px solid var(--outline-variant)", height: totalH }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0"
                    style={{ top: (h - TT_START) * HOUR_H, borderTop: "1px solid var(--outline-variant)" }}
                  />
                ))}
                {short === todayDay && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "rgba(34,197,94,0.04)" }}
                  />
                )}
                {daySlots.map((slot, i) => {
                  const startMin = timeToMinutes(slot.start_time);
                  const endMin = timeToMinutes(slot.end_time);
                  const topPx = ((startMin - TT_START * 60) / 60) * HOUR_H;
                  const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_H, 18);
                  const colors = slotColors[i % 3];
                  return (
                    <div
                      key={slot.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden"
                      style={{ top: topPx, height: heightPx, background: colors.bg, borderLeft: `2px solid ${colors.border}` }}
                    >
                      <div className="px-1 py-0.5">
                        <p className="text-[8px] font-bold truncate leading-tight" style={{ color: colors.text }}>
                          {slot.label}
                        </p>
                        {heightPx > 26 && (
                          <p className="text-[7px] leading-tight" style={{ color: colors.border }}>
                            {slot.start_time}–{slot.end_time}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
  const { data: bizData, mutate: mutateBiz } = useSWR<BusinessDetails | null>("/api/business", fetcher);
  const { data: docs = [], mutate: mutateDocs }   = useSWR<TrainingDoc[]>("/api/training-docs", fetcher, { fallbackData: [] });
  const { data: slots = [], mutate: mutateSlots } = useSWR<AvailabilitySlot[]>("/api/slots", fetcher, { fallbackData: [] });

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

  /* ── Schedule view ── */
  const [selectedDay, setSelectedDay] = useState<DayName>(todayDay);
  const [scheduleView, setScheduleView] = useState<"list" | "timetable">("list");

  const activeDays = useMemo<DayName[]>(
    () => [...new Set(slots.map((s) => DAY_SHORT[s.day_of_week]).filter(Boolean))] as DayName[],
    [slots]
  );

  const daySlots = useMemo(
    () => slots.filter((s) => DAY_SHORT[s.day_of_week] === selectedDay),
    [slots, selectedDay]
  );

  /* ── Slot modal (add & edit) ── */
  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  const [slotForm, setSlotForm] = useState({ label: "", day_of_week: "Monday", start_time: "", end_time: "" });
  const [submittingSlot, setSubmittingSlot] = useState(false);

  function openAddSlot() {
    setSlotForm({ label: "", day_of_week: DAYS.find(d => d.short === selectedDay)?.full ?? "Monday", start_time: "", end_time: "" });
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl self-start sm:self-auto"
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

        {/* ══ Two-column grid ══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

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

            {/* Weekly Schedule */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Weekly Schedule</p>
                <div className="flex items-center gap-1 p-1 rounded-xl"
                  style={{ background: "var(--surface-container-low)" }}>
                  <button
                    onClick={() => setScheduleView("list")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: scheduleView === "list" ? "var(--surface-container-highest)" : "transparent",
                      color: scheduleView === "list" ? "var(--on-surface)" : "var(--on-surface-variant)",
                    }}>
                    <LayoutGrid className="w-3.5 h-3.5" /> Week
                  </button>
                  <button
                    onClick={() => setScheduleView("timetable")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: scheduleView === "timetable" ? "var(--surface-container-highest)" : "transparent",
                      color: scheduleView === "timetable" ? "var(--on-surface)" : "var(--on-surface-variant)",
                    }}>
                    <Table2 className="w-3.5 h-3.5" /> Timetable
                  </button>
                </div>
              </div>

              <div className="p-5">
                {scheduleView === "list" ? (
                  <>
                    <div className="grid grid-cols-7 gap-1.5 mb-5">
                      {DAYS.map(({ short }) => {
                        const isToday = short === todayDay;
                        const isActive = activeDays.includes(short);
                        const isSelected = selectedDay === short;
                        return (
                          <button
                            key={short}
                            onClick={() => setSelectedDay(short)}
                            className={clsx(
                              "flex flex-col items-center gap-1 py-3 rounded-2xl transition-all",
                              isSelected ? "scale-105" : "hover:scale-105"
                            )}
                            style={{
                              background: isSelected
                                ? isToday
                                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                                  : "linear-gradient(135deg, var(--primary), var(--primary-container))"
                                : isToday
                                  ? "rgba(34,197,94,0.12)"
                                  : isActive
                                    ? "rgba(234,179,8,0.12)"   /* amber tint for available */
                                    : "var(--surface-container)",
                              color: isSelected
                                ? "#fff"
                                : isToday
                                  ? "#16a34a"
                                  : isActive
                                    ? "#a16207"                /* amber text */
                                    : "var(--on-surface-variant)",
                              border: isToday && !isSelected
                                ? "1.5px solid #22c55e"
                                : isActive && !isSelected
                                  ? "1.5px solid #eab308"      /* amber border */
                                  : "1.5px solid transparent",
                            }}>
                            <span className="text-[10px] font-bold uppercase tracking-wide">{short}</span>
                            {isActive && !isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full"
                                style={{ background: isToday ? "#22c55e" : "#eab308" }} />
                            )}
                            {isSelected && <div className="w-1 h-1 rounded-full bg-white opacity-80" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs"
                      style={{ color: "var(--on-surface-variant)" }}>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
                        Available
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                        Today
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--surface-container)" }} />
                        Closed
                      </span>
                    </div>
                  </>
                ) : (
                  <TimetableView slots={slots} />
                )}
              </div>
            </div>

            {/* Active Slots */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <div>
                  <p className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--on-surface)" }}>
                    Active Time Slots
                    <span className="text-xs font-normal px-2 py-0.5 rounded-lg"
                      style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                      {DAYS.find((d) => d.short === selectedDay)?.full}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Booking windows your AI agent can confirm
                  </p>
                </div>
                <button onClick={openAddSlot}
                  className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> Add Slot
                </button>
              </div>
              <div className="p-5 space-y-3">
                {daySlots.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Clock className="w-8 h-8" style={{ color: "var(--outline)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
                      No slots for {DAYS.find((d) => d.short === selectedDay)?.full}
                    </p>
                    <p className="text-xs" style={{ color: "var(--outline)" }}>
                      Add slots to let your AI confirm bookings on this day
                    </p>
                  </div>
                ) : (
                  daySlots.map((slot, i) => {
                    const colors = slotColors[i % 3];
                    return (
                      <div key={slot.id}
                        className="group flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.005]"
                        style={{ background: colors.bg, borderLeft: `3px solid ${colors.border}` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(255,255,255,0.25)" }}>
                          <Clock className="w-4 h-4" style={{ color: colors.border }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.border }}>
                            {slot.day_of_week}
                          </span>
                          <p className="text-sm font-bold" style={{ color: colors.text }}>{slot.label}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle className="w-3.5 h-3.5" style={{ color: colors.border }} />
                            <span className="text-xs font-medium" style={{ color: colors.text }}>
                              {slot.start_time} – {slot.end_time}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditSlot(slot)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110"
                            style={{ background: "rgba(255,255,255,0.3)", color: colors.border }}
                            aria-label="Edit slot">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(slot)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110"
                            style={{ background: "rgba(255,255,255,0.3)", color: colors.border }}
                            aria-label="Delete slot">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
        </div>

        <div className="h-16 lg:hidden" />
      </div>

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
    </AppShell>
  );
}
