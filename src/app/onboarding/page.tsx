"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, ChevronRight, ChevronLeft, Check,
  Sparkles, Building2, Scissors, ShoppingBag, GraduationCap,
  Music2, CalendarCheck, Hotel, HeartPulse, Briefcase, Plane, HelpCircle,
  Plus, Trash2, FileText, Upload, AlertCircle, Loader2,
  Clock, Calendar, LayoutGrid, CheckCircle2, Users, Wand2, Copy,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Business Identity" },
  { id: 2, label: "Services" },
  { id: 3, label: "Schedule" },
  { id: 4, label: "Agent Settings" },
] as const;

const CATEGORIES = [
  { value: "Beauty",                      label: "Beauty",                      icon: Scissors    },
  { value: "Spa & Salon",                 label: "Spa & Salon",                 icon: Sparkles    },
  { value: "Clothing & Apparel",          label: "Clothing & Apparel",          icon: ShoppingBag },
  { value: "Education",                   label: "Education",                   icon: GraduationCap },
  { value: "Entertainment",              label: "Entertainment",               icon: Music2      },
  { value: "Event Planning & Services",  label: "Event Planning",              icon: CalendarCheck },
  { value: "Hotel & Lodging",             label: "Hotel & Lodging",             icon: Hotel       },
  { value: "Medical & Health",            label: "Medical & Health",            icon: HeartPulse  },
  { value: "Professional Services",       label: "Professional Services",       icon: Briefcase   },
  { value: "Travel & Transport",          label: "Travel & Transport",          icon: Plane       },
  { value: "Other",                       label: "Other",                       icon: HelpCircle  },
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Category-specific hints for the description field
const CATEGORY_HINTS: Record<string, string> = {
  "Beauty":                     "e.g. Haircuts, colour treatments, nail care. Include any patch-test or preparation requirements.",
  "Spa & Salon":                "e.g. Massages, facials, body wraps. Mention session durations and any health contraindications.",
  "Clothing & Apparel":         "e.g. Tailoring, alterations, custom designs. Mention turnaround times and fitting sessions.",
  "Education":                  "e.g. Tutoring, courses, workshops. Include age groups, levels, and class sizes.",
  "Entertainment":              "e.g. Live performances, DJ sets, photography. Include event types and coverage areas.",
  "Event Planning & Services":  "e.g. Weddings, corporate events. Include package tiers and lead time requirements.",
  "Hotel & Lodging":            "e.g. Room types, amenities, check-in/out times, breakfast inclusion.",
  "Medical & Health":           "e.g. Consultations, therapies, procedures. Include any referral or form requirements.",
  "Professional Services":      "e.g. Legal advice, accounting, consulting. Mention engagement models and consultation lengths.",
  "Travel & Transport":         "e.g. Airport transfers, tours, rentals. Include vehicle types and coverage areas.",
  "Other":                      "Describe what you offer, how customers can book, and any important details.",
};

// Category-specific suggested document labels
const CATEGORY_DOC_HINTS: Record<string, string[]> = {
  "Beauty":                    ["Services Menu / Price List", "Before & After Policy", "Booking Terms"],
  "Spa & Salon":               ["Treatment Menu", "Health Disclaimer Form", "Gift Voucher Info"],
  "Clothing & Apparel":        ["Size Guide", "Alteration Price List", "Care Instructions"],
  "Education":                 ["Course Catalogue", "Fee Schedule", "Enrolment Policy"],
  "Entertainment":             ["Portfolio / Show Reel Info", "Event Package Rates", "Technical Rider"],
  "Event Planning & Services": ["Package Brochure", "Venue List", "Contract Terms"],
  "Hotel & Lodging":           ["Room Rates", "Amenities Guide", "Cancellation Policy"],
  "Medical & Health":          ["Services & Fees", "Credentials / Accreditation", "Patient Intake Form"],
  "Professional Services":     ["Service Overview", "Rate Card", "Engagement Letter Template"],
  "Travel & Transport":        ["Route / Fleet Guide", "Booking Terms", "Insurance Info"],
  "Other":                     ["Services Brochure", "Price List", "FAQ Document"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatTime(val: string) {
  if (!val) return "";
  const [h, m] = val.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── TimePicker (inline compact) ───────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINS  = ["00","15","30","45"];

function TimeInput({ value, onChange, placeholder = "Time" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const [selH, selM] = value ? value.split(":") : ["", ""];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
        style={{ backgroundColor: "var(--surface-container-low)", border: `1.5px solid ${open ? "var(--primary)" : "transparent"}`, color: value ? "var(--on-surface)" : "var(--outline)" }}>
        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: open ? "var(--primary)" : "var(--outline)" }} />
        <span className="font-medium">{value ? formatTime(value) : placeholder}</span>
      </button>
      {open && (
        <div className="fixed rounded-xl overflow-hidden flex"
          style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999, backgroundColor: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <div className="overflow-y-auto py-1" style={{ maxHeight: 160, borderRight: "1px solid var(--outline-variant)", minWidth: 52 }}>
            {HOURS.map((h) => {
              const hr = parseInt(h); const lbl = hr===0?12:hr>12?hr-12:hr; const ap=hr<12?"am":"pm";
              const sel = selH===h;
              return (
                <button key={h} type="button" onClick={() => onChange(`${h}:${selM||"00"}`)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs"
                  style={{ backgroundColor: sel?"var(--primary-container)":"transparent", color: sel?"var(--primary)":"var(--on-surface)", fontWeight: sel?700:400 }}>
                  <span>{lbl}</span><span style={{ color: sel?"var(--primary)":"var(--outline)", fontSize:9 }}>{ap}</span>
                </button>
              );
            })}
          </div>
          <div className="overflow-y-auto py-1" style={{ maxHeight: 160, minWidth: 48 }}>
            {MINS.map((m) => {
              const sel = selM===m;
              return (
                <button key={m} type="button" onClick={() => { onChange(`${selH||"09"}:${m}`); setOpen(false); }}
                  className="w-full text-center px-2.5 py-1.5 text-xs"
                  style={{ backgroundColor: sel?"var(--primary-container)":"transparent", color: sel?"var(--primary)":"var(--on-surface)", fontWeight: sel?700:400 }}>
                  :{m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceRow { id: string; name: string; price: string; description: string; }
interface DaySlots   { [day: string]: { start: string; end: string; label: string }[] }

// ── Main Onboarding Component ─────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory]         = useState("");
  const [categoryOther, setCategoryOther] = useState("");

  // Step 2 state
  const [description, setDescription] = useState("");
  const [services, setServices]       = useState<ServiceRow[]>([{ id: "tmp-" + Date.now(), name: "", price: "", description: "" }]);
  const [uploading, setUploading]     = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ id: string; file_name: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extracting, setExtracting]   = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractDone, setExtractDone]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [scheduleMode, setScheduleMode] = useState<"daily" | "weekly" | "custom" | "">("");
  // daily: one set of slots applied every day
  const [dailySlots, setDailySlots] = useState<{ start: string; end: string; label: string }[]>([]);
  // weekly: per day-of-week slots
  const [weeklySlots, setWeeklySlots] = useState<DaySlots>({});
  // Copy-to-days popover: which day's copy panel is open
  const [copyDayOpen, setCopyDayOpen] = useState<string | null>(null);
  // custom: per specific date slots
  const [customSlots, setCustomSlots] = useState<DaySlots>({});
  // For custom/weekly calendar navigation
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selDate,  setSelDate]  = useState<string | null>(null);

  // Step 4 state
  const [autoConfirm,     setAutoConfirm]     = useState(false);
  const [allowStaffPick,  setAllowStaffPick]  = useState(true);

  // Load existing data on mount
  useEffect(() => {
    Promise.all([
      fetcher("/api/profile"),
      fetcher("/api/business"),
      fetcher("/api/services"),
      fetcher("/api/training-docs"),
    ]).then(([profile, biz, svc, docs]) => {
      if (profile.data?.business_name)   setBusinessName(profile.data.business_name);
      if (biz.data?.description)         setDescription(biz.data.description);
      if (biz.data?.category)            setCategory(biz.data.category);
      if (biz.data?.category_other)      setCategoryOther(biz.data.category_other);
      if (biz.data?.auto_confirm   != null) setAutoConfirm(biz.data.auto_confirm);
      if (biz.data?.allow_staff_pick != null) setAllowStaffPick(biz.data.allow_staff_pick);
      if (biz.data?.schedule_mode)       setScheduleMode(biz.data.schedule_mode);
      if (Array.isArray(svc.data) && svc.data.length > 0) {
        setServices(svc.data.map((s: { id: string; name: string; price: string | null; description: string | null }) => ({
          id: s.id, name: s.name, price: s.price ?? "", description: s.description ?? ""
        })));
      }
      if (Array.isArray(docs.data)) setUploadedDocs(docs.data.map((d: { id: string; file_name: string }) => ({ id: d.id, file_name: d.file_name })));
    });
  }, []);

  // ── Step save handlers ───────────────────────────────────────────

  async function saveStep1() {
    if (!businessName.trim()) { setError("Please enter your business name."); return false; }
    if (!category) { setError("Please select a category."); return false; }
    if (category === "Other" && !categoryOther.trim()) { setError("Please specify your category."); return false; }
    setError(null); setSaving(true);
    await Promise.all([
      fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_name: businessName.trim() }) }),
      fetch("/api/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, category_other: categoryOther.trim() || null }) }),
    ]);
    setSaving(false);
    return true;
  }

  async function saveStep2() {
    setError(null); setSaving(true);
    // Save description
    await fetch("/api/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) });
    // Save services — delete existing then insert new ones
    const validServices = services.filter((s) => s.name.trim());
    for (const svc of validServices) {
      // If id looks like a UUID from DB (not a temp one) check if it starts with our placeholder prefix
      const isTemp = !svc.id.includes("-") || svc.id.length < 30;
      if (isTemp) {
        await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: svc.name, price: svc.price, description: svc.description }) });
      }
    }
    setSaving(false);
    return true;
  }

  async function saveStep3() {
    if (!scheduleMode) { setError("Please choose a schedule type."); return false; }
    setError(null); setSaving(true);

    // Save schedule_mode
    await fetch("/api/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule_mode: scheduleMode }) });

    // Convert slots to availability_slots API calls
    if (scheduleMode === "daily" && dailySlots.length > 0) {
      for (const slot of dailySlots) {
        for (const day of DAYS) {
          await fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: slot.label || "Available", day_of_week: day, start_time: slot.start, end_time: slot.end }) });
        }
      }
    } else if (scheduleMode === "weekly") {
      for (const [day, slots] of Object.entries(weeklySlots)) {
        for (const slot of slots) {
          await fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: slot.label || "Available", day_of_week: day, start_time: slot.start, end_time: slot.end }) });
        }
      }
    } else if (scheduleMode === "custom") {
      // Custom slots are date-specific — we store them as availability slots by day_of_week
      // For custom, just skip the slot creation here (user adds slots after in my-details)
    }

    setSaving(false);
    return true;
  }

  async function saveStep4() {
    setError(null); setSaving(true);
    await fetch("/api/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_confirm: autoConfirm, allow_staff_pick: allowStaffPick }) });
    setSaving(false);
    return true;
  }

  async function completeOnboarding() {
    setSaving(true);
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarding_completed: true }) });
    setSaving(false);
    router.push("/my-details");
  }

  // ── Navigation ───────────────────────────────────────────────────

  async function handleNext() {
    let ok = false;
    if (step === 1) ok = await saveStep1();
    if (step === 2) ok = await saveStep2();
    if (step === 3) ok = await saveStep3();
    if (step === 4) { await saveStep4(); await completeOnboarding(); return; }
    if (ok) setStep((s) => s + 1);
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  // ── Upload doc ───────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(null);
    const form = new FormData(); form.append("file", file);
    const res = await fetch("/api/training-docs", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setUploadError(json.error ?? "Upload failed"); }
    else { setUploadedDocs((p) => [...p, { id: json.data?.id ?? Date.now().toString(), file_name: file.name }]); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleExtractServices() {
    if (!description.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setExtractDone(false);
    const res = await fetch("/api/extract-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const json = await res.json();
    setExtracting(false);
    if (!res.ok) {
      setExtractError(json.error ?? "Failed to extract services.");
      return;
    }
    const extracted: { name: string; price: string; description: string }[] = json.services ?? [];
    if (extracted.length === 0) {
      setExtractError("No services found in the description. Try adding more detail, or add services manually below.");
      return;
    }
    setServices(extracted.map((s, i) => ({ id: `tmp-extracted-${Date.now()}-${i}`, name: s.name, price: s.price, description: s.description })));
    setExtractDone(true);
  }

  async function handleDeleteDoc(id: string) {
    await fetch(`/api/training-docs/${id}`, { method: "DELETE" });
    setUploadedDocs((p) => p.filter((d) => d.id !== id));
  }

  // ── Calendar helpers ─────────────────────────────────────────────

  function buildCells(year: number, month: number) {
    const first = new Date(year, month, 1).getDay();
    const days  = new Date(year, month + 1, 0).getDate();
    const prev  = new Date(year, month, 0).getDate();
    const cells: { day: number; month: number; year: number; cur: boolean }[] = [];
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    for (let i = first - 1; i >= 0; i--) cells.push({ day: prev - i, month: pm, year: py, cur: false });
    for (let d = 1; d <= days; d++) cells.push({ day: d, month, year, cur: true });
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    let n = 1;
    while (cells.length < 42) cells.push({ day: n++, month: nm, year: ny, cur: false });
    return cells;
  }

  function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function weekdayOf(y: number, m: number, d: number) {
    return DAYS[((new Date(y, m, d).getDay() + 6) % 7)]; // Mon=0
  }

  // ── Slot helpers ──────────────────────────────────────────────────

  function addDailySlot() {
    setDailySlots((p) => [...p, { start: "", end: "", label: "" }]);
  }

  function removeDailySlot(i: number) {
    setDailySlots((p) => p.filter((_, idx) => idx !== i));
  }

  function addWeeklySlot(day: string) {
    setWeeklySlots((p) => ({ ...p, [day]: [...(p[day] ?? []), { start: "", end: "", label: "" }] }));
  }

  function removeWeeklySlot(day: string, i: number) {
    setWeeklySlots((p) => ({ ...p, [day]: (p[day] ?? []).filter((_, idx) => idx !== i) }));
  }

  function handleCopyToDay(fromDay: string, toDay: string) {
    const slots = weeklySlots[fromDay] ?? [];
    if (slots.length === 0) return;
    // Deep-copy the slots so each day's slots are independent
    setWeeklySlots((p) => ({ ...p, [toDay]: slots.map((s) => ({ ...s })) }));
  }

  function addCustomSlot(dateStr: string) {
    setCustomSlots((p) => ({ ...p, [dateStr]: [...(p[dateStr] ?? []), { start: "", end: "", label: "" }] }));
  }

  function removeCustomSlot(dateStr: string, i: number) {
    setCustomSlots((p) => ({ ...p, [dateStr]: (p[dateStr] ?? []).filter((_, idx) => idx !== i) }));
  }

  // ── MONTHS ────────────────────────────────────────────────────────
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WEEK_NAMES  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-lowest)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>AI Booking Agent Setup</span>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
          Step {step} of {STEPS.length}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: "var(--surface-container-low)" }}>
        <div className="h-full transition-all duration-500"
          style={{ width: `${(step / STEPS.length) * 100}%`, background: "linear-gradient(90deg, var(--primary), var(--secondary))" }} />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 p-6 gap-3"
          style={{ borderRight: "1px solid var(--outline-variant)" }}>
          {STEPS.map((s) => {
            const done    = s.id < step;
            const active  = s.id === step;
            const pending = s.id > step;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                  style={{
                    backgroundColor: done ? "var(--primary)" : active ? "var(--primary-container)" : "var(--surface-container-low)",
                    color: done ? "var(--on-primary)" : active ? "var(--primary)" : "var(--on-surface-variant)",
                    border: active ? "2px solid var(--primary)" : "2px solid transparent",
                  }}>
                  {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="text-xs font-semibold" style={{ color: active ? "var(--primary)" : pending ? "var(--outline)" : "var(--on-surface-variant)" }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 1 — Business Identity
            ══════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Tell us about your business</h1>
                  <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
                    This helps your AI agent introduce your business correctly to customers.
                  </p>
                </div>

                {/* Business name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                    Business Name <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                    <input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Glow Studio, City Clinic, Ace Tutors…"
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                    />
                  </div>
                </div>

                {/* Category grid */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                    Business Category <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map(({ value, label, icon: Icon }) => {
                      const selected = category === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setCategory(value); if (value !== "Other") setCategoryOther(""); }}
                          className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: selected ? "var(--primary-container)" : "var(--surface-container-low)",
                            border: `1.5px solid ${selected ? "var(--primary)" : "transparent"}`,
                            color: selected ? "var(--primary)" : "var(--on-surface-variant)",
                          }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: selected ? "var(--primary)" : "var(--surface-container-high)" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: selected ? "var(--on-primary)" : "var(--on-surface-variant)" }} />
                          </div>
                          <span className="text-xs font-semibold leading-tight">{label}</span>
                          {selected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "var(--primary)" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Other — specify */}
                {category === "Other" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                      Specify your category <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      value={categoryOther}
                      onChange={(e) => setCategoryOther(e.target.value)}
                      placeholder="e.g. Pet Grooming, Photography Studio…"
                      className="w-full px-4 py-3 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 2 — Services & Description
            ══════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Your Services</h1>
                  <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
                    Describe what you offer and let AI extract your services automatically.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Service Description</label>
                  <p className="text-xs" style={{ color: "var(--outline)" }}>
                    {category && CATEGORY_HINTS[category] ? `Hint: ${CATEGORY_HINTS[category]}` : "Write a short introduction about your business — include what you offer, your location, and how customers can reach you (phone, email, or website)."}
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setExtractDone(false); setExtractError(null); }}
                    rows={5}
                    placeholder={`e.g. "Welcome to ${businessName || 'our business'}! We offer professional services in the heart of the city. Our menu includes: Haircut - $25, Hair Colour - From $60, Blowdry - $20, Manicure - $35, Pedicure - $40. Visit us at 123 Main St or call +1 234 567 8900."`}
                    className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                    style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                  />

                  {/* AI Extract button */}
                  <button
                    type="button"
                    onClick={handleExtractServices}
                    disabled={extracting || !description.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                      color: "var(--on-primary)",
                    }}
                  >
                    {extracting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Extracting services…</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Extract Services with AI</>
                    )}
                  </button>

                  {extractError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                      style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {extractError}
                    </div>
                  )}

                  {extractDone && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
                      style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>{services.length} service{services.length !== 1 ? "s" : ""}</strong> extracted from your description.
                        You can edit, remove, or add more below.
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub-services */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Sub-services / Menu</label>
                      <p className="text-xs mt-0.5" style={{ color: "var(--outline)" }}>
                        {extractDone ? "AI-extracted — edit freely or add more below" : "Add individual services with optional prices"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setServices((p) => [...p, { id: "tmp-" + Date.now(), name: "", price: "", description: "" }])}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                      <Plus className="w-3.5 h-3.5" /> Add Service
                    </button>
                  </div>

                  {services.length === 0 && !extractDone ? (
                    <div className="flex flex-col items-center py-8 gap-3 rounded-2xl"
                      style={{ border: "1.5px dashed var(--outline-variant)" }}>
                      <Wand2 className="w-8 h-8" style={{ color: "var(--outline)" }} />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
                          Paste your service menu or description above
                        </p>
                        <p className="text-xs" style={{ color: "var(--outline)" }}>
                          then click &ldquo;Extract Services with AI&rdquo; to auto-fill this list
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {services.map((svc, i) => (
                        <div key={svc.id}
                          className="rounded-xl overflow-hidden"
                          style={{ border: "1px solid var(--outline-variant)" }}>
                          {/* Service number strip */}
                          <div className="flex items-center gap-2 px-3 py-1.5"
                            style={{ backgroundColor: "var(--surface-container-low)", borderBottom: "1px solid var(--outline-variant)" }}>
                            <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                              {i + 1}
                            </span>
                            <span className="text-[10px] font-semibold flex-1" style={{ color: "var(--on-surface-variant)" }}>
                              {svc.name || "Unnamed service"}
                            </span>
                            <button type="button"
                              onClick={() => setServices((p) => p.filter((_, idx) => idx !== i))}
                              className="w-6 h-6 flex items-center justify-center rounded-lg"
                              style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Fields */}
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={svc.name}
                              onChange={(e) => setServices((p) => p.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                              placeholder="Service name (e.g. Haircut)"
                              className="w-full px-3 py-2 text-sm rounded-lg outline-none col-span-full sm:col-span-1"
                              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                              onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                            />
                            <input
                              value={svc.price}
                              onChange={(e) => setServices((p) => p.map((s, idx) => idx === i ? { ...s, price: e.target.value } : s))}
                              placeholder="Price (e.g. $25, From $50)"
                              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                              onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                            />
                            <input
                              value={svc.description}
                              onChange={(e) => setServices((p) => p.map((s, idx) => idx === i ? { ...s, description: e.target.value } : s))}
                              placeholder="Short description (optional)"
                              className="w-full px-3 py-2 text-sm rounded-lg outline-none col-span-full"
                              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                              onBlur={(e)  => (e.currentTarget.style.borderColor = "transparent")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Training Documents</label>
                    <p className="text-xs mt-0.5" style={{ color: "var(--outline)" }}>
                      Upload PDFs to help your AI answer detailed questions.
                      {category && CATEGORY_DOC_HINTS[category] && (
                        <> Suggested: {CATEGORY_DOC_HINTS[category].join(", ")}.</>
                      )}
                    </p>
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs"
                      style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {uploadError}
                    </div>
                  )}

                  <label className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploading ? "opacity-60 pointer-events-none" : "hover:border-[var(--primary)]"}`}
                    style={{ borderColor: "var(--outline-variant)" }}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} /> : <Upload className="w-4 h-4" style={{ color: "var(--outline)" }} />}
                    <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      {uploading ? "Uploading…" : "Click to upload PDF, DOC, DOCX"}
                    </span>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                  </label>

                  {uploadedDocs.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                          style={{ backgroundColor: "var(--surface-container-low)" }}>
                          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary)" }} />
                          <span className="flex-1 text-xs truncate" style={{ color: "var(--on-surface)" }}>{doc.file_name}</span>
                          <button type="button" onClick={() => handleDeleteDoc(doc.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 3 — Schedule
            ══════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Set your availability</h1>
                  <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
                    Choose how you want to set up your time slots. You can edit these anytime in My Details.
                  </p>
                </div>

                {/* Mode picker */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { mode: "daily" as const,  icon: Clock,      label: "Daily Timetable",   desc: "Same slots every day" },
                    { mode: "weekly" as const, icon: LayoutGrid, label: "Weekly Timetable",  desc: "Different per day of week" },
                    { mode: "custom" as const, icon: Calendar,   label: "Custom Calendar",   desc: "Any date, any time" },
                  ].map(({ mode, icon: Icon, label, desc }) => {
                    const sel = scheduleMode === mode;
                    return (
                      <button key={mode} type="button" onClick={() => setScheduleMode(mode)}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: sel ? "var(--primary-container)" : "var(--surface-container-low)",
                          border: `2px solid ${sel ? "var(--primary)" : "transparent"}`,
                        }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: sel ? "var(--primary)" : "var(--surface-container-high)" }}>
                          <Icon className="w-4.5 h-4.5" style={{ color: sel ? "var(--on-primary)" : "var(--on-surface-variant)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: sel ? "var(--primary)" : "var(--on-surface)" }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: sel ? "var(--on-primary-container)" : "var(--on-surface-variant)" }}>{desc}</p>
                        </div>
                        {sel && <Check className="w-4 h-4 self-end" style={{ color: "var(--primary)" }} />}
                      </button>
                    );
                  })}
                </div>

                {/* ── Daily slots ── */}
                {scheduleMode === "daily" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Daily Time Slots</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--outline)" }}>These slots repeat every day of the week</p>
                      </div>
                      <button type="button" onClick={addDailySlot}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                        style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                        <Plus className="w-3.5 h-3.5" /> Add Slot
                      </button>
                    </div>
                    {dailySlots.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2 rounded-2xl"
                        style={{ border: "1.5px dashed var(--outline-variant)" }}>
                        <Clock className="w-8 h-8" style={{ color: "var(--outline)" }} />
                        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>No slots yet. Click &quot;Add Slot&quot; above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dailySlots.map((slot, i) => (
                          <div key={i} className="flex items-center gap-2 p-3 rounded-xl"
                            style={{ backgroundColor: "var(--surface-container-low)" }}>
                            <input value={slot.label} onChange={(e) => setDailySlots((p) => p.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))}
                              placeholder="Label (e.g. Morning)"
                              className="flex-1 px-3 py-2 text-sm rounded-lg outline-none min-w-0"
                              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                            <TimeInput value={slot.start} onChange={(v) => setDailySlots((p) => p.map((s, idx) => idx === i ? { ...s, start: v } : s))} placeholder="Start" />
                            <span className="text-xs" style={{ color: "var(--outline)" }}>–</span>
                            <TimeInput value={slot.end} onChange={(v) => setDailySlots((p) => p.map((s, idx) => idx === i ? { ...s, end: v } : s))} placeholder="End" />
                            <button type="button" onClick={() => removeDailySlot(i)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {dailySlots.length > 0 && (
                      <div className="rounded-xl p-3 flex items-center gap-2 text-xs"
                        style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}>
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        These slots will be created for all 7 days of the week.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Weekly slots ── */}
                {scheduleMode === "weekly" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Slots per Day of Week</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--outline)" }}>
                        Set slots for each day. Use the <strong>copy</strong> button to copy a day&apos;s slots to other days instantly.
                      </p>
                    </div>
                    {DAYS.map((day) => {
                      const daySlots = weeklySlots[day] ?? [];
                      const otherDays = DAYS.filter((d) => d !== day);
                      const isCopyOpen = copyDayOpen === day;
                      return (
                        <div key={day} className="rounded-xl"
                          style={{ border: "1px solid var(--outline-variant)" }}>
                          {/* Day header */}
                          <div
                            className={`flex items-center justify-between px-4 py-2.5 ${daySlots.length > 0 ? "rounded-t-xl" : "rounded-xl"}`}
                            style={{
                              backgroundColor: daySlots.length > 0 ? "var(--surface-container-low)" : "var(--surface-container-lowest)",
                              borderBottom: daySlots.length > 0 ? "1px solid var(--outline-variant)" : undefined,
                            }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>{day}</span>
                              {daySlots.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                                  {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {daySlots.length === 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>Closed</span>
                              )}
                              {/* Copy button — only shown when day has slots */}
                              {daySlots.length > 0 && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setCopyDayOpen(isCopyOpen ? null : day)}
                                    title="Copy slots to other days"
                                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all"
                                    style={{
                                      backgroundColor: isCopyOpen ? "var(--secondary)" : "var(--secondary-container)",
                                      color: isCopyOpen ? "var(--on-secondary)" : "var(--secondary)",
                                    }}>
                                    <Copy className="w-3 h-3" />
                                    Copy to
                                  </button>

                                  {/* Copy popover */}
                                  {isCopyOpen && (
                                    <div
                                      className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20"
                                      style={{
                                        minWidth: 180,
                                        backgroundColor: "var(--surface-container-lowest)",
                                        border: "1px solid var(--outline-variant)",
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                                      }}>
                                      {/* Popover header */}
                                      <div className="px-3 py-2"
                                        style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-low)" }}>
                                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--on-surface-variant)" }}>
                                          Copy {day}&apos;s slots to:
                                        </p>
                                      </div>
                                      {/* Day options */}
                                      <div className="py-1">
                                        {otherDays.map((targetDay) => {
                                          const targetHasSlots = (weeklySlots[targetDay] ?? []).length > 0;
                                          return (
                                            <button
                                              key={targetDay}
                                              type="button"
                                              onClick={() => {
                                                handleCopyToDay(day, targetDay);
                                                setCopyDayOpen(null);
                                              }}
                                              className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all hover:opacity-80"
                                              style={{ backgroundColor: "transparent" }}
                                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-container-low)")}
                                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                              <span className="font-semibold" style={{ color: "var(--on-surface)" }}>{targetDay}</span>
                                              {targetHasSlots ? (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                  style={{ backgroundColor: "rgba(249,115,22,0.12)", color: "#ea580c" }}>
                                                  Overwrite
                                                </span>
                                              ) : (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                  style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                                                  Empty
                                                </span>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {/* Copy to all */}
                                      <div style={{ borderTop: "1px solid var(--outline-variant)" }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            otherDays.forEach((d) => handleCopyToDay(day, d));
                                            setCopyDayOpen(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-all"
                                          style={{ color: "var(--primary)" }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-container)")}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          Copy to all other days
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <button type="button" onClick={() => addWeeklySlot(day)}
                                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                                style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                          </div>
                          {daySlots.length > 0 && (
                            <div className="p-3 space-y-2">
                              {daySlots.map((slot, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <input value={slot.label}
                                    onChange={(e) => setWeeklySlots((p) => ({ ...p, [day]: p[day].map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) }))}
                                    placeholder="Label"
                                    className="flex-1 px-3 py-2 text-xs rounded-lg outline-none min-w-0"
                                    style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                                  <TimeInput value={slot.start}
                                    onChange={(v) => setWeeklySlots((p) => ({ ...p, [day]: p[day].map((s, idx) => idx === i ? { ...s, start: v } : s) }))}
                                    placeholder="Start" />
                                  <span className="text-xs" style={{ color: "var(--outline)" }}>–</span>
                                  <TimeInput value={slot.end}
                                    onChange={(v) => setWeeklySlots((p) => ({ ...p, [day]: p[day].map((s, idx) => idx === i ? { ...s, end: v } : s) }))}
                                    placeholder="End" />
                                  <button type="button" onClick={() => removeWeeklySlot(day, i)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                                    style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Custom calendar ── */}
                {scheduleMode === "custom" && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Click any date to add time slots</p>

                    {/* Calendar grid */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--outline-variant)" }}>
                      {/* Month nav */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-low)" }}>
                        <button type="button" onClick={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                        <button type="button" onClick={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Weekday headers */}
                      <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                        {WEEK_NAMES.map((d) => (
                          <div key={d} className="py-2 text-center text-[10px] font-semibold" style={{ color: "var(--on-surface-variant)" }}>{d}</div>
                        ))}
                      </div>
                      {/* Cells */}
                      <div className="grid grid-cols-7">
                        {buildCells(calYear, calMonth).map((cell, i) => {
                          const key      = dateKey(cell.year, cell.month, cell.day);
                          const hasSlots = (customSlots[key]?.length ?? 0) > 0;
                          const isSel    = selDate === key && cell.cur;
                          const isTod    = cell.cur && cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
                          return (
                            <div key={i}
                              onClick={() => cell.cur && setSelDate(isSel ? null : key)}
                              className="min-h-[56px] p-1.5 transition-colors"
                              style={{
                                borderRight:     i % 7 !== 6 ? "1px solid var(--outline-variant)" : undefined,
                                borderBottom:    i < 35 ? "1px solid var(--outline-variant)" : undefined,
                                backgroundColor: isSel ? "var(--primary-container)" : "transparent",
                                cursor:          cell.cur ? "pointer" : "default",
                                opacity:         cell.cur ? 1 : 0.3,
                              }}>
                              <div className="flex justify-center mb-1">
                                <span className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: isTod ? "var(--primary)" : "transparent",
                                    color: isTod ? "var(--on-primary)" : isSel ? "var(--on-primary-container)" : "var(--on-surface)",
                                  }}>{cell.day}</span>
                              </div>
                              {hasSlots && (
                                <div className="flex justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected date slots */}
                    {selDate && (
                      <div className="rounded-xl" style={{ border: "1px solid var(--outline-variant)" }}>
                        <div className="flex items-center justify-between px-4 py-3 rounded-t-xl"
                          style={{ backgroundColor: "var(--surface-container-low)", borderBottom: "1px solid var(--outline-variant)" }}>
                          <div>
                            <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                              {new Date(selDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                            </p>
                            <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                              {weekdayOf(parseInt(selDate.slice(0,4)), parseInt(selDate.slice(5,7))-1, parseInt(selDate.slice(8,10)))}
                            </p>
                          </div>
                          <button type="button" onClick={() => addCustomSlot(selDate)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                            style={{ backgroundColor: "var(--primary-container)", color: "var(--primary)" }}>
                            <Plus className="w-3.5 h-3.5" /> Add Slot
                          </button>
                        </div>
                        <div className="p-3 space-y-2">
                          {(customSlots[selDate] ?? []).length === 0 ? (
                            <p className="text-xs text-center py-3" style={{ color: "var(--outline)" }}>No slots yet. Click &quot;Add Slot&quot; above.</p>
                          ) : (
                            (customSlots[selDate] ?? []).map((slot, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input value={slot.label}
                                  onChange={(e) => setCustomSlots((p) => ({ ...p, [selDate]: p[selDate].map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) }))}
                                  placeholder="Label"
                                  className="flex-1 px-3 py-2 text-xs rounded-lg outline-none min-w-0"
                                  style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface)", border: "1.5px solid transparent" }}
                                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                                <TimeInput value={slot.start}
                                  onChange={(v) => setCustomSlots((p) => ({ ...p, [selDate]: p[selDate].map((s, idx) => idx === i ? { ...s, start: v } : s) }))}
                                  placeholder="Start" />
                                <span className="text-xs" style={{ color: "var(--outline)" }}>–</span>
                                <TimeInput value={slot.end}
                                  onChange={(v) => setCustomSlots((p) => ({ ...p, [selDate]: p[selDate].map((s, idx) => idx === i ? { ...s, end: v } : s) }))}
                                  placeholder="End" />
                                <button type="button" onClick={() => removeCustomSlot(selDate, i)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                                  style={{ backgroundColor: "var(--error-container)", color: "var(--error)" }}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs p-3 rounded-xl"
                      style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}>
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      You can add more dates at any time from the My Details page after setup.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 4 — Agent Settings
            ══════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Agent Behaviour</h1>
                  <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
                    Configure how your AI agent handles bookings.
                  </p>
                </div>

                {/* Auto-confirm */}
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--outline-variant)" }}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-low)" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>Booking Confirmation</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                      When a customer books via WhatsApp, what status should the appointment get?
                    </p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--outline-variant)" }}>
                    {[
                      { value: false, label: "Pending — I review and confirm manually", desc: "You'll see new appointments in your dashboard and confirm them yourself. Recommended for most businesses." },
                      { value: true,  label: "Auto-confirm — Confirm immediately",       desc: "Appointments are confirmed the moment a customer books. Best if you don't need to check schedules manually." },
                    ].map(({ value, label, desc }) => (
                      <button key={String(value)} type="button"
                        onClick={() => setAutoConfirm(value)}
                        className="w-full flex items-start gap-4 px-5 py-4 text-left transition-all"
                        style={{ backgroundColor: autoConfirm === value ? "var(--primary-container)" : "transparent" }}>
                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                          style={{ borderColor: autoConfirm === value ? "var(--primary)" : "var(--outline)" }}>
                          {autoConfirm === value && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: autoConfirm === value ? "var(--primary)" : "var(--on-surface)" }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Staff pick */}
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--outline-variant)" }}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-low)" }}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>Staff Selection by Customers</p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                      Can customers request a specific staff member while chatting with the AI agent?
                    </p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--outline-variant)" }}>
                    {[
                      { value: true,  label: "Yes — Customers can choose a staff member", desc: "The AI will mention available team members and let the customer pick who they want." },
                      { value: false, label: "No — Assign automatically",                 desc: "The AI won't mention staff names. Appointments are assigned by the admin." },
                    ].map(({ value, label, desc }) => (
                      <button key={String(value)} type="button"
                        onClick={() => setAllowStaffPick(value)}
                        className="w-full flex items-start gap-4 px-5 py-4 text-left transition-all"
                        style={{ backgroundColor: allowStaffPick === value ? "var(--primary-container)" : "transparent" }}>
                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                          style={{ borderColor: allowStaffPick === value ? "var(--primary)" : "var(--outline)" }}>
                          {allowStaffPick === value && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: allowStaffPick === value ? "var(--primary)" : "var(--on-surface)" }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "var(--secondary-container)" }}>
                  <p className="text-sm font-bold" style={{ color: "var(--on-secondary-container)" }}>Setup Summary</p>
                  {[
                    { icon: Building2,   label: "Business",   value: businessName || "—" },
                    { icon: category === "Beauty" ? Scissors : Briefcase, label: "Category", value: category === "Other" ? categoryOther || "Other" : category || "—" },
                    { icon: FileText,    label: "Services",   value: `${services.filter(s => s.name.trim()).length} service${services.filter(s => s.name.trim()).length !== 1 ? "s" : ""} added` },
                    { icon: Clock,       label: "Schedule",   value: scheduleMode ? scheduleMode.charAt(0).toUpperCase() + scheduleMode.slice(1) + " timetable" : "—" },
                    { icon: CheckCircle2, label: "Bookings",  value: autoConfirm ? "Auto-confirmed" : "Pending review" },
                    { icon: Users,       label: "Staff pick", value: allowStaffPick ? "Enabled" : "Disabled" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--secondary)" }} />
                      <span className="text-xs font-semibold w-20 flex-shrink-0" style={{ color: "var(--on-secondary-container)", opacity: 0.7 }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--on-secondary-container)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Bottom nav bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid var(--outline-variant)", backgroundColor: "var(--surface-container-lowest)" }}>
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-30"
          style={{ backgroundColor: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          {/* Step dots — mobile */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {STEPS.map((s) => (
              <div key={s.id} className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: s.id === step ? "var(--primary)" : s.id < step ? "var(--primary)" : "var(--outline-variant)", opacity: s.id === step ? 1 : 0.5 }} />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl btn-primary disabled:opacity-60">
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : step === STEPS.length
              ? <><CheckCircle2 className="w-4 h-4" /> Finish Setup</>
              : <>{step === 3 && scheduleMode === "" ? "Skip for now" : "Continue"} <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>

    </div>
  );
}
