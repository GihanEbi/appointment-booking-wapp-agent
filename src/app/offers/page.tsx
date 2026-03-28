"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Gift, Plus, Users, TrendingUp, Send, Loader2, Trash2,
  CheckCircle, XCircle, EyeOff, CalendarX, AlertTriangle,
  Search, X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CARD_GRADIENTS = [
  ["#6366f1", "#a5b4fc"],
  ["#0ea5e9", "#7dd3fc"],
  ["#10b981", "#6ee7b7"],
  ["#f59e0b", "#fde68a"],
  ["#ec4899", "#f9a8d4"],
  ["#8b5cf6", "#c4b5fd"],
];

interface Offer {
  id: string;
  title: string;
  discount: string;
  description: string;
  valid_until: string;
  status?: "active" | "inactive" | "expired" | null;
  sent_count: number;
  redeemed_count: number;
  created_at: string;
}

interface Customer {
  customer_phone: string;
  customer_name: string;
}

type ConfirmType = "inactive" | "activate" | "expire" | "delete";

interface ConfirmState {
  type: ConfirmType;
  offerId: string;
  offerTitle: string;
}

const CONFIRM_CONFIG: Record<ConfirmType, {
  title: string; body: string; action: string; danger: boolean;
}> = {
  inactive: {
    title: "Set Offer to Inactive?",
    body: "This offer will be paused. You can re-activate it any time.",
    action: "Set Inactive",
    danger: false,
  },
  activate: {
    title: "Re-activate Offer?",
    body: "This offer will move back to Active and can be sent to customers again.",
    action: "Activate",
    danger: false,
  },
  expire: {
    title: "Expire This Offer?",
    body: "This offer will be marked as expired and can no longer be sent. This cannot be undone.",
    action: "Expire Now",
    danger: false,
  },
  delete: {
    title: "Delete Offer?",
    body: "This will permanently remove the offer and all its data. This cannot be undone.",
    action: "Delete",
    danger: true,
  },
};

export default function OffersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", discount: "", description: "", valid_until: "" });
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [sendTarget, setSendTarget] = useState<Offer | null>(null);

  const { data: offers = [], mutate, isLoading } = useSWR<Offer[]>("/api/offers", fetcher);

  const active   = useMemo(() => offers.filter((o) => !o.status || o.status === "active"),   [offers]);
  const inactive = useMemo(() => offers.filter((o) => o.status === "inactive"),              [offers]);
  const expired  = useMemo(() => offers.filter((o) => o.status === "expired"),               [offers]);

  const totalSent     = offers.reduce((s, o) => s + (o.sent_count ?? 0), 0);
  const totalRedeemed = offers.reduce((s, o) => s + (o.redeemed_count ?? 0), 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowCreate(false);
    setForm({ title: "", discount: "", description: "", valid_until: "" });
    await mutate();
  }

  async function executeAction(state: ConfirmState) {
    setConfirmState(null);
    setActionLoading(state.offerId);

    if (state.type === "delete") {
      await fetch(`/api/offers/${state.offerId}`, { method: "DELETE" });
      mutate(offers.filter((o) => o.id !== state.offerId), { revalidate: false });
    } else {
      const statusMap: Record<string, string> = {
        inactive: "inactive",
        activate: "active",
        expire: "expired",
      };
      const newStatus = statusMap[state.type];
      const res = await fetch(`/api/offers/${state.offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        mutate(
          offers.map((o) => o.id === state.offerId ? { ...o, status: newStatus as Offer["status"] } : o),
          { revalidate: true }
        );
      }
    }

    setActionLoading(null);
  }

  return (
    <AppShell>
      <div className="space-y-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Send Offers
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Create special offers and send them to your customers via WhatsApp.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start">
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Offers", value: offers.length, icon: Gift, color: "#6366f1" },
            { label: "Total Sent",   value: totalSent,     icon: Send, color: "#0ea5e9" },
            { label: "Redeemed",     value: totalRedeemed, icon: TrendingUp, color: "#10b981" },
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

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <>
            {/* ── Active ── */}
            <section className="space-y-4">
              <SectionHeader color="#22c55e" label="Active" count={active.length} pulse />
              {active.length === 0 ? (
                <EmptyState onCreateClick={() => setShowCreate(true)} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {active.map((offer, idx) => (
                    <ActiveOfferCard
                      key={offer.id}
                      offer={offer}
                      gradient={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
                      loading={actionLoading === offer.id}
                      onSend={() => setSendTarget(offer)}
                      onInactive={() => setConfirmState({ type: "inactive", offerId: offer.id, offerTitle: offer.title })}
                      onExpire={()   => setConfirmState({ type: "expire",   offerId: offer.id, offerTitle: offer.title })}
                      onDelete={()   => setConfirmState({ type: "delete",   offerId: offer.id, offerTitle: offer.title })}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Inactive ── */}
            {inactive.length > 0 && (
              <section className="space-y-4">
                <SectionHeader color="#f59e0b" label="Inactive" count={inactive.length} />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {inactive.map((offer, idx) => (
                    <InactiveOfferCard
                      key={offer.id}
                      offer={offer}
                      gradient={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
                      loading={actionLoading === offer.id}
                      onActivate={() => setConfirmState({ type: "activate", offerId: offer.id, offerTitle: offer.title })}
                      onDelete={()   => setConfirmState({ type: "delete",   offerId: offer.id, offerTitle: offer.title })}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Expired ── */}
            {expired.length > 0 && (
              <section className="space-y-4">
                <SectionHeader color="var(--outline)" label="Expired" count={expired.length} />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {expired.map((offer, idx) => (
                    <ExpiredOfferCard
                      key={offer.id}
                      offer={offer}
                      gradient={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
                      loading={actionLoading === offer.id}
                      onDelete={() => setConfirmState({ type: "delete", offerId: offer.id, offerTitle: offer.title })}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Create Modal ══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>New Offer</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 rounded-b-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Offer Title <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input required value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Holiday Season Special"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Discount <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input required value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                    placeholder="e.g. 25% OFF"
                    className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                    Valid Until
                  </label>
                  <input value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    placeholder="e.g. Dec 31"
                    className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>Description</label>
                <textarea rows={3} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the offer for your customers…"
                  className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  Create Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Confirm Modal ══ */}
      {confirmState && (
        <ConfirmModal
          state={confirmState}
          onConfirm={() => executeAction(confirmState)}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ══ Send Offer Modal ══ */}
      {sendTarget && (
        <SendOfferModal
          offer={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={(count) => {
            mutate(
              offers.map((o) => o.id === sendTarget.id
                ? { ...o, sent_count: (o.sent_count ?? 0) + count }
                : o),
              { revalidate: true }
            );
          }}
        />
      )}
    </AppShell>
  );
}

/* ── helpers ── */
function SectionHeader({ color, label, count, pulse }: { color: string; label: string; count: number; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full${pulse ? " animate-pulse" : ""}`} style={{ background: color }} />
      <h2 className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>{label}</h2>
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
        style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
        {count}
      </span>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
      style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
      <Gift className="w-9 h-9" style={{ color: "var(--outline)" }} />
      <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
        No active offers. Create one and start sending to customers.
      </p>
      <button onClick={onCreateClick}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
        style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
        Create Offer
      </button>
    </div>
  );
}

/* ── Active card ─────────────────────────────────────────────── */
function ActiveOfferCard({ offer, gradient, loading, onSend, onInactive, onExpire, onDelete }: {
  offer: Offer; gradient: string[]; loading: boolean;
  onSend: () => void; onInactive: () => void; onExpire: () => void; onDelete: () => void;
}) {
  const rate = offer.sent_count > 0 ? Math.round((offer.redeemed_count / offer.sent_count) * 100) : 0;
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.08)" }}>
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Special Offer</p>
            <p className="text-3xl font-black text-white mt-0.5 leading-none">{offer.discount}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white/90 text-[10px] font-bold"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            Active
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{offer.title}</p>
          {offer.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{offer.description}</p>
          )}
          {offer.valid_until && (
            <p className="text-xs mt-1 font-medium" style={{ color: "var(--outline)" }}>Valid until: {offer.valid_until}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--on-surface-variant)" }}>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{offer.sent_count} sent</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{offer.redeemed_count} redeemed ({rate}%)</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface-container-high)" }}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rate, 100)}%`, background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <button onClick={onSend} disabled={loading}
            className="w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 text-white"
            style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Customers
          </button>
          <div className="flex gap-1.5">
            <button onClick={onInactive} disabled={loading}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(245,158,11,0.1)", color: "#92400e" }}>
              <EyeOff className="w-3 h-3" />Inactive
            </button>
            <button onClick={onExpire} disabled={loading}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(234,179,8,0.1)", color: "#a16207" }}>
              <CalendarX className="w-3 h-3" />Expire
            </button>
            <button onClick={onDelete} disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--error-container)", color: "var(--error)" }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inactive card ───────────────────────────────────────────── */
function InactiveOfferCard({ offer, gradient, loading, onActivate, onDelete }: {
  offer: Offer; gradient: string[]; loading: boolean;
  onActivate: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col opacity-75"
      style={{ background: "var(--surface-container-lowest)", border: "1px solid rgba(245,158,11,0.2)" }}>
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${gradient[0]}55, ${gradient[1]}55)` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Special Offer</p>
            <p className="text-3xl font-black text-white/70 mt-0.5 leading-none">{offer.discount}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
            style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.7)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            Inactive
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{offer.title}</p>
          {offer.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{offer.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(245,158,11,0.08)", color: "#92400e" }}>
          <EyeOff className="w-3 h-3 flex-shrink-0" />
          Not visible to customers
        </div>
        <div className="flex gap-1.5 mt-auto">
          <button onClick={onActivate} disabled={loading}
            className="flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Activate
          </button>
          <button onClick={onDelete} disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "var(--error-container)", color: "var(--error)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Expired card ────────────────────────────────────────────── */
function ExpiredOfferCard({ offer, gradient, loading, onDelete }: {
  offer: Offer; gradient: string[]; loading: boolean; onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col opacity-55"
      style={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)" }}>
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${gradient[0]}30, ${gradient[1]}30)` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--outline)" }}>Expired</p>
            <p className="text-3xl font-black mt-0.5 leading-none" style={{ color: "var(--on-surface-variant)" }}>{offer.discount}</p>
          </div>
          <Gift className="w-6 h-6" style={{ color: "var(--outline)" }} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{offer.title}</p>
          {offer.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{offer.description}</p>
          )}
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--on-surface-variant)" }}>
          <span>{offer.sent_count} sent</span>
          <span>{offer.redeemed_count} redeemed</span>
        </div>
        <button onClick={onDelete} disabled={loading}
          className="mt-auto w-full py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: "var(--error-container)", color: "var(--error)" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </button>
      </div>
    </div>
  );
}

/* ── Confirm Modal ───────────────────────────────────────────── */
function ConfirmModal({ state, onConfirm, onCancel }: {
  state: ConfirmState; onConfirm: () => void; onCancel: () => void;
}) {
  const cfg = CONFIRM_CONFIG[state.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-sm rounded-2xl"
        style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: cfg.danger ? "var(--error-container)" : "rgba(234,179,8,0.12)" }}>
            {cfg.danger
              ? <Trash2 className="w-5 h-5" style={{ color: "var(--error)" }} />
              : <AlertTriangle className="w-5 h-5" style={{ color: "#a16207" }} />}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>{cfg.title}</p>
            <p className="text-xs mt-1 font-semibold" style={{ color: "var(--primary)" }}>"{state.offerTitle}"</p>
            <p className="text-sm mt-2" style={{ color: "var(--on-surface-variant)" }}>{cfg.body}</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
              style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
              style={{
                background: cfg.danger ? "var(--error)" : "rgba(234,179,8,0.2)",
                color: cfg.danger ? "var(--on-error)" : "#92400e",
              }}>
              {cfg.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Send Offer Modal ────────────────────────────────────────── */
function SendOfferModal({ offer, onClose, onSent }: {
  offer: Offer; onClose: () => void; onSent: (count: number) => void;
}) {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<{ sent: number; failed: number } | null>(null);

  const { data: customers = [], isLoading: loadingCustomers } =
    useSWR<Customer[]>("/api/customers", fetcher);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.customer_name?.toLowerCase().includes(q) || c.customer_phone.includes(q)
    );
  }, [customers, search]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.customer_phone));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((c) => next.delete(c.customer_phone));
      else filtered.forEach((c) => next.add(c.customer_phone));
      return next;
    });
  }

  function toggle(phone: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/offers/${offer.id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: Array.from(selected) }),
      });
      const data = await res.json();
      setResult(data);
      onSent(data.sent ?? 0);
    } catch {
      setResult({ sent: 0, failed: selected.size });
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && !sending && onClose()}>
      <div className="w-full max-w-md rounded-2xl flex flex-col"
        style={{
          background: "var(--surface-container-lowest)",
          boxShadow: "0px 24px 48px rgba(20,29,36,0.2)",
          maxHeight: "88vh",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 rounded-t-2xl"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
              <Send className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Send Offer</p>
              <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{offer.title}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={sending}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Offer preview */}
        <div className="px-5 py-3 flex-shrink-0"
          style={{ background: "var(--surface-container-low)", borderBottom: "1px solid var(--outline-variant)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--primary-container)" }}>
              <Gift className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{offer.title}</p>
              <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                {offer.discount}{offer.valid_until ? ` · Valid until ${offer.valid_until}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className="px-5 py-3 flex-shrink-0 flex items-center gap-2 text-sm"
            style={{
              background: result.sent > 0 ? "var(--primary-container)" : "#f443361a",
              borderBottom: "1px solid var(--outline-variant)",
              color: result.sent > 0 ? "var(--on-primary-container)" : "var(--error)",
            }}>
            {result.sent > 0
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <XCircle className="w-4 h-4 flex-shrink-0" />}
            {result.sent > 0
              ? `Sent to ${result.sent} customer${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` · ${result.failed} failed` : ""}`
              : "Send failed. Please try again."}
          </div>
        )}

        {/* Search + select all */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--surface-container-low)", border: "1.5px solid var(--outline-variant)" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--outline)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--on-surface)" }} />
            </div>
            <button onClick={toggleAll}
              className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80"
              style={{
                background: allSelected ? "var(--primary)" : "var(--surface-container-low)",
                color: allSelected ? "var(--on-primary)" : "var(--on-surface-variant)",
              }}>
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
            {selected.size > 0
              ? <><span style={{ color: "var(--primary)", fontWeight: 600 }}>{selected.size}</span> customer{selected.size !== 1 ? "s" : ""} selected</>
              : "Select customers to send this offer to"}
          </p>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
          {loadingCustomers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <Users className="w-7 h-7" style={{ color: "var(--outline)" }} />
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                {customers.length === 0
                  ? "No customers yet. They appear once they message you on WhatsApp."
                  : "No customers match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => {
                const sel = selected.has(c.customer_phone);
                return (
                  <button key={c.customer_phone} onClick={() => toggle(c.customer_phone)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80"
                    style={{ background: sel ? "var(--primary-container)" : "var(--surface-container-low)" }}>
                    {/* Checkbox */}
                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: sel ? "var(--primary)" : "transparent", border: `2px solid ${sel ? "var(--primary)" : "var(--outline)"}` }}>
                      {sel && <CheckCircle className="w-3 h-3" style={{ color: "var(--on-primary)" }} />}
                    </div>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: sel ? "var(--primary)" : "var(--outline)" }}>
                      {(c.customer_name || c.customer_phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate"
                        style={{ color: sel ? "var(--on-primary-container)" : "var(--on-surface)" }}>
                        {c.customer_name || "Unknown"}
                      </p>
                      <p className="text-xs truncate"
                        style={{ color: sel ? "var(--on-primary-container)" : "var(--on-surface-variant)" }}>
                        {c.customer_phone}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex-shrink-0 rounded-b-2xl" style={{ borderTop: "1px solid var(--outline-variant)" }}>
          {result ? (
            <button onClick={onClose}
              className="w-full py-2.5 text-sm font-semibold rounded-xl"
              style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
              Close
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={onClose} disabled={sending}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
                style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                Cancel
              </button>
              <button onClick={handleSend} disabled={selected.size === 0 || sending}
                className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                  : <><Send className="w-4 h-4" />Send to {selected.size > 0 ? `${selected.size} Customer${selected.size !== 1 ? "s" : ""}` : "Customers"}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
