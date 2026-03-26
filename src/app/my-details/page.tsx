"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  UserCircle2, FileText, Upload, Trash2, Clock,
  CheckCircle, ChevronLeft, ChevronRight, Bot,
  Plus, Pencil, Save, X, AlertCircle,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import useSWR from "swr";
import clsx from "clsx";
import type { BusinessDetails, AvailabilitySlot, TrainingDoc } from "@/types/database";

/* ── Types ─────────────────────────────────────────────────── */
type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

const DAYS: { short: DayName; full: string; date: number }[] = [
  { short: "Mon", full: "Monday",    date: 21 },
  { short: "Tue", full: "Tuesday",   date: 22 },
  { short: "Wed", full: "Wednesday", date: 23 },
  { short: "Thu", full: "Thursday",  date: 24 },
  { short: "Fri", full: "Friday",    date: 25 },
  { short: "Sat", full: "Saturday",  date: 26 },
  { short: "Sun", full: "Sunday",    date: 27 },
];

const DAY_SHORT: Record<string, DayName> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

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
    // Reset input so the same file can be re-uploaded after delete
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteDoc(id: string) {
    await fetch(`/api/training-docs/${id}`, { method: "DELETE" });
    mutateDocs((prev = []) => prev.filter((d) => d.id !== id), false);
  }

  /* ── Slots ── */
  const [selectedDay, setSelectedDay] = useState<DayName>("Fri");

  const activeDays = useMemo<DayName[]>(
    () => [...new Set(slots.map((s) => DAY_SHORT[s.day_of_week]).filter(Boolean))] as DayName[],
    [slots]
  );

  async function handleDeleteSlot(id: string) {
    await fetch(`/api/slots/${id}`, { method: "DELETE" });
    mutateSlots((prev = []) => prev.filter((s) => s.id !== id), false);
  }

  /* ── Add Slot modal ── */
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ label: "", day_of_week: "Monday", start_time: "", end_time: "" });
  const [addingSlot, setAddingSlot] = useState(false);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setAddingSlot(true);
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSlot),
    });
    if (res.ok) {
      await mutateSlots();
      setShowAddSlot(false);
      setNewSlot({ label: "", day_of_week: "Monday", start_time: "", end_time: "" });
    }
    setAddingSlot(false);
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

              {/* Drop zone */}
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

              {/* Docs list */}
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
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                    style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>Mar 2026</span>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                    style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-7 gap-1.5 mb-5">
                  {DAYS.map(({ short, date }) => {
                    const isActive = activeDays.includes(short);
                    const isSelected = selectedDay === short;
                    return (
                      <button key={short} onClick={() => setSelectedDay(short)}
                        className={clsx("flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all",
                          isSelected ? "scale-105" : "hover:scale-105")}
                        style={{
                          background: isSelected
                            ? "linear-gradient(135deg, var(--primary), var(--primary-container))"
                            : isActive ? "var(--surface-container-low)" : "var(--surface-container)",
                          color: isSelected ? "var(--on-primary)"
                            : isActive ? "var(--on-surface)" : "var(--on-surface-variant)",
                        }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{short}</span>
                        <span className="text-sm font-bold">{date}</span>
                        {isActive && !isSelected && (
                          <div className="w-1 h-1 rounded-full" style={{ background: "var(--primary)" }} />
                        )}
                        {isSelected && <div className="w-1 h-1 rounded-full bg-white opacity-80" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--surface-container)" }} />
                    Closed
                  </span>
                </div>
              </div>
            </div>

            {/* Active Slots */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Active Time Slots</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Booking windows your AI agent can confirm
                  </p>
                </div>
                <button onClick={() => setShowAddSlot(true)}
                  className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> Add Slot
                </button>
              </div>
              <div className="p-5 space-y-3">
                {slots.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Clock className="w-8 h-8" style={{ color: "var(--outline)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
                      No time slots configured
                    </p>
                    <p className="text-xs" style={{ color: "var(--outline)" }}>
                      Add slots to let your AI confirm bookings
                    </p>
                  </div>
                ) : slots.map((slot, i) => {
                  const colors = slotColors[i % 3];
                  return (
                    <div key={slot.id}
                      className="group relative flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.005]"
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
                      <button onClick={() => handleDeleteSlot(slot.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110 shrink-0"
                        style={{ background: "rgba(255,255,255,0.4)", color: colors.border }}
                        aria-label="Remove slot">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
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

      {/* ── Add Slot Modal ── */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowAddSlot(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Add Time Slot</p>
              <button onClick={() => setShowAddSlot(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="p-5 space-y-4">
              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Slot Label
                </label>
                <input required value={newSlot.label}
                  onChange={(e) => setNewSlot((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Morning Session"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
              </div>

              {/* Day of week */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Day of Week
                </label>
                <select required value={newSlot.day_of_week}
                  onChange={(e) => setNewSlot((p) => ({ ...p, day_of_week: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none appearance-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}>
                  {DAYS.map((d) => (
                    <option key={d.full} value={d.full}>{d.full}</option>
                  ))}
                </select>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                {(["start_time", "end_time"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                      {field === "start_time" ? "Start Time" : "End Time"}
                    </label>
                    <input required type="time" value={newSlot[field]}
                      onChange={(e) => setNewSlot((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                      style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddSlot(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={addingSlot}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {addingSlot
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Plus className="w-4 h-4" />}
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
