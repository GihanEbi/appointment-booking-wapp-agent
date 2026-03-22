"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  UserCircle2,
  FileText,
  Upload,
  Trash2,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Bot,
  Plus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

/* ── Types ── */
type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

interface TimeSlot {
  id: number;
  day: string;
  date: string;
  label: string;
  start: string;
  end: string;
}

interface TrainingDoc {
  id: number;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

/* ── Static data ── */
const DAYS: { short: DayName; date: number }[] = [
  { short: "Mon", date: 21 },
  { short: "Tue", date: 22 },
  { short: "Wed", date: 23 },
  { short: "Thu", date: 24 },
  { short: "Fri", date: 25 },
  { short: "Sat", date: 26 },
  { short: "Sun", date: 27 },
];

const INITIAL_SLOTS: TimeSlot[] = [
  { id: 1, day: "Friday", date: "Oct 25", label: "Morning Session", start: "09:00 AM", end: "12:00 PM" },
  { id: 2, day: "Thursday", date: "Oct 24", label: "Afternoon Block", start: "01:00 PM", end: "05:00 PM" },
  { id: 3, day: "Wednesday", date: "Oct 23", label: "Daily Review", start: "09:00 AM", end: "11:00 AM" },
];

const INITIAL_DOCS: TrainingDoc[] = [
  { id: 1, name: "Studio Pulse - Service Menu 2024.pdf", size: "1.2 MB", type: "PDF", uploadedAt: "Mar 18, 2024" },
  { id: 2, name: "Pricing & Packages Brochure.pdf", size: "840 KB", type: "PDF", uploadedAt: "Mar 10, 2024" },
  { id: 3, name: "Holiday Promotions Q4.pdf", size: "620 KB", type: "PDF", uploadedAt: "Feb 28, 2024" },
];

const ACTIVE_DAYS: DayName[] = ["Mon", "Wed", "Thu", "Fri"];

/* ── Helpers ── */
const slotColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "var(--primary-container)", text: "var(--on-primary-container)", border: "var(--primary)" },
  2: { bg: "var(--tertiary-container)", text: "var(--on-tertiary-container)", border: "var(--tertiary)" },
  3: { bg: "var(--secondary-container)", text: "var(--on-secondary-container)", border: "var(--secondary)" },
};

/* ── Component ── */
export default function MyDetailsPage() {
  const [description, setDescription] = useState(
    "Studio Pulse is a premium hair and beauty salon. We offer expert hair styling, colouring, beard grooming, facial treatments, and relaxation massages. Our AI concierge handles WhatsApp inquiries and bookings 24/7, ensuring clients always get timely, accurate responses about our services, pricing, and availability."
  );
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(description);

  const [docs, setDocs] = useState<TrainingDoc[]>(INITIAL_DOCS);
  const [slots, setSlots] = useState<TimeSlot[]>(INITIAL_SLOTS);
  const [selectedDay, setSelectedDay] = useState<DayName>("Fri");
  const [aiStatus] = useState("Learning from latest updates...");

  function handleDeleteDoc(id: number) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  function handleDeleteSlot(id: number) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <AppShell>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              My Details
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Service information and availability settings for your AI booking agent.
            </p>
          </div>

          {/* AI status chip */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl self-start sm:self-auto"
            style={{ background: "var(--surface-container-low)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-none" style={{ color: "var(--on-surface)" }}>
                AI Status
              </p>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--primary)" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {aiStatus}
              </p>
            </div>
          </div>
        </div>

        {/* ══ Two-column grid ══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ─── LEFT: Service Information ─── */}
          <div className="space-y-5">

            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
              >
                <UserCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  Service Information
                </p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Manage how your AI concierge describes and sells your services.
                </p>
              </div>
            </div>

            {/* Service Description card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}
              >
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  Service Description
                </p>
                {!editingDescription ? (
                  <button
                    onClick={() => {
                      setDraftDescription(description);
                      setEditingDescription(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                    style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDescription(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                      style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDescription(draftDescription);
                        setEditingDescription(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg btn-primary transition-all duration-200"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5">
                {editingDescription ? (
                  <textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    rows={5}
                    className="w-full text-sm leading-relaxed rounded-xl px-4 py-3 outline-none resize-none transition-all duration-200"
                    style={{
                      background: "var(--surface-container-low)",
                      color: "var(--on-surface)",
                      border: "2px solid var(--primary)",
                    }}
                  />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                    {description}
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: "var(--outline)" }}>
                  This text is used by your AI agent to describe services to clients on WhatsApp.
                </p>
              </div>
            </div>

            {/* Training Documents card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                    Training Documents
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Upload PDFs, brochures, or price lists for the AI to analyze.
                  </p>
                </div>
                <label
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" />
                </label>
              </div>

              {/* Upload drop zone */}
              <div className="px-5 pt-4">
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-xl py-6 border-2 border-dashed cursor-pointer transition-all duration-200 hover:border-[var(--primary)]"
                  style={{ borderColor: "var(--outline-variant)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--surface-container-high)" }}
                  >
                    <Upload className="w-5 h-5" style={{ color: "var(--on-surface-variant)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--on-surface)" }}>
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                    PDF, DOC, DOCX • Max 10 MB per file
                  </p>
                </div>
              </div>

              {/* Active Documents list */}
              <div className="px-5 pt-4 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--on-surface-variant)" }}>
                  Active Documents
                </p>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.005] group"
                      style={{ background: "var(--surface-container-low)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                          {doc.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                          {doc.size} · Uploaded {doc.uploadedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: "var(--surface-container-highest)", color: "var(--on-surface-variant)" }}
                        >
                          {doc.type}
                        </span>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                          style={{ background: "var(--error-container)", color: "var(--error)" }}
                          aria-label="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Availability Management ─── */}
          <div className="space-y-5">

            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--secondary), var(--secondary-container))" }}
              >
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  Availability Management
                </p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Set the time windows when your AI can confirm appointments.
                </p>
              </div>
            </div>

            {/* Weekly Schedule card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}
              >
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                  Weekly Schedule
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                    style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Oct 2024
                  </span>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                    style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {/* Day selector */}
                <div className="grid grid-cols-7 gap-1.5 mb-5">
                  {DAYS.map(({ short, date }) => {
                    const isActive = ACTIVE_DAYS.includes(short);
                    const isSelected = selectedDay === short;
                    return (
                      <button
                        key={short}
                        onClick={() => setSelectedDay(short)}
                        className={clsx(
                          "flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-200",
                          isSelected ? "scale-105" : "hover:scale-105"
                        )}
                        style={{
                          background: isSelected
                            ? "linear-gradient(135deg, var(--primary), var(--primary-container))"
                            : isActive
                            ? "var(--surface-container-low)"
                            : "var(--surface-container)",
                          color: isSelected
                            ? "var(--on-primary)"
                            : isActive
                            ? "var(--on-surface)"
                            : "var(--on-surface-variant)",
                        }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                          {short}
                        </span>
                        <span className="text-sm font-bold">{date}</span>
                        {isActive && !isSelected && (
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                        {isSelected && (
                          <div className="w-1 h-1 rounded-full bg-white opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--primary)" }}
                    />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--surface-container)" }}
                    />
                    Closed
                  </span>
                </div>
              </div>
            </div>

            {/* Active Slots card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>
                    Active Time Slots
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                    Booking windows your AI agent can confirm
                  </p>
                </div>
                <button
                  className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slot
                </button>
              </div>

              <div className="p-5 space-y-3">
                {slots.map((slot, i) => {
                  const colors = slotColors[(i % 3) + 1] || slotColors[1];
                  return (
                    <div
                      key={slot.id}
                      className="group relative flex items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.005]"
                      style={{
                        background: colors.bg,
                        borderLeft: `3px solid ${colors.border}`,
                      }}
                    >
                      {/* Time icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.25)" }}
                      >
                        <Clock className="w-4 h-4" style={{ color: colors.border }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Day & date badge */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: colors.border }}
                          >
                            {slot.day}, {slot.date}
                          </span>
                        </div>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
                          {slot.label}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: colors.border }} />
                          <span className="text-xs font-medium" style={{ color: colors.text }}>
                            {slot.start} – {slot.end}
                          </span>
                        </div>
                      </div>

                      {/* Delete button — appears on hover */}
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110 shrink-0"
                        style={{ background: "rgba(255,255,255,0.4)", color: colors.border }}
                        aria-label="Remove slot"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {slots.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Clock className="w-8 h-8" style={{ color: "var(--outline)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
                      No time slots configured
                    </p>
                    <p className="text-xs" style={{ color: "var(--outline)" }}>
                      Add slots to let your AI confirm bookings
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI learning notice */}
            <div
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--on-primary-container))" }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">AI is Syncing</p>
                <p className="text-xs mt-1 leading-relaxed opacity-80">
                  Your AI agent is currently re-learning from the latest documents and schedule changes. This usually takes 1–2 minutes.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span className="text-xs font-semibold">{aiStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile nav spacer */}
        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
