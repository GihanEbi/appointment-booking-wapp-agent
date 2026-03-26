"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Gift,
  Plus,
  Users,
  TrendingUp,
  Send,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Cycle through brand colors for offer cards
const CARD_COLORS = [
  { from: "var(--primary)", to: "var(--primary-container)" },
  { from: "var(--secondary)", to: "var(--secondary-container)" },
  { from: "var(--tertiary)", to: "var(--tertiary-container)" },
];

interface Offer {
  id: string;
  title: string;
  discount: string;
  description: string;
  valid_until: string;
  sent_count: number;
  redeemed_count: number;
  created_at: string;
}

interface BroadcastState {
  offerId: string;
  status: "idle" | "sending" | "done" | "error";
  result?: { sent: number; failed: number };
}

interface OfferForm {
  title: string;
  discount: string;
  description: string;
  valid_until: string;
}

export default function OffersPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<OfferForm>({
    title: "",
    discount: "",
    description: "",
    valid_until: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastState | null>(null);
  const [confirmBroadcastId, setConfirmBroadcastId] = useState<string | null>(null);

  const { data: offers, mutate, isLoading } = useSWR<Offer[]>("/api/offers", fetcher);

  const totalSent = (offers ?? []).reduce((s, o) => s + (o.sent_count ?? 0), 0);
  const totalRedeemed = (offers ?? []).reduce((s, o) => s + (o.redeemed_count ?? 0), 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ title: "", discount: "", description: "", valid_until: "" });
    await mutate();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await mutate();
  }

  async function handleBroadcast(offerId: string) {
    setConfirmBroadcastId(null);
    setBroadcast({ offerId, status: "sending" });

    try {
      const res = await fetch(`/api/offers/${offerId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        setBroadcast({ offerId, status: "error" });
      } else {
        setBroadcast({ offerId, status: "done", result: data });
        await mutate();
      }
    } catch {
      setBroadcast({ offerId, status: "error" });
    }

    // Auto-clear after 5s
    setTimeout(() => setBroadcast(null), 5000);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Marketing &amp; Offers Console
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Create and send special offers to your clients via WhatsApp AI.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Offers", value: (offers?.length ?? 0).toString(), icon: Gift, color: "var(--primary)" },
            { label: "Total Sent", value: totalSent.toLocaleString(), icon: Send, color: "var(--secondary)" },
            { label: "Total Redeemed", value: totalRedeemed.toLocaleString(), icon: TrendingUp, color: "var(--tertiary)" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}22` }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>{s.value}</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Offers grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : !offers || offers.length === 0 ? (
          <div
            className="rounded-2xl p-12 flex flex-col items-center gap-3"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)", color: "var(--on-surface-variant)" }}
          >
            <Gift className="w-10 h-10 opacity-30" />
            <p className="text-sm text-center">
              No offers yet. Create your first offer and broadcast it to all your WhatsApp customers.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm mt-2"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {offers.map((offer, idx) => {
              const colors = CARD_COLORS[idx % CARD_COLORS.length];
              const isBroadcasting = broadcast?.offerId === offer.id && broadcast.status === "sending";
              const broadcastDone = broadcast?.offerId === offer.id && broadcast.status === "done";
              const broadcastErr = broadcast?.offerId === offer.id && broadcast.status === "error";
              const redemptionRate = offer.sent_count > 0
                ? Math.round((offer.redeemed_count / offer.sent_count) * 100)
                : 0;

              return (
                <div
                  key={offer.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
                >
                  {/* Gradient header */}
                  <div
                    className="p-5 flex items-start justify-between"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                        Special Offer
                      </p>
                      <p className="text-2xl font-black text-white mt-0.5">{offer.discount}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {deletingId === offer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                      ) : (
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="p-1.5 rounded-lg text-white/70 hover:text-white/100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Gift className="w-7 h-7 text-white/40" />
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="font-bold text-sm mb-1" style={{ color: "var(--on-surface)" }}>
                      {offer.title}
                    </p>
                    {offer.description && (
                      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--on-surface-variant)" }}>
                        {offer.description}
                      </p>
                    )}

                    <p className="text-xs mb-3" style={{ color: "var(--on-surface-variant)" }}>
                      Valid until: {offer.valid_until || "Ongoing"}
                    </p>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--on-surface-variant)" }}>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {offer.sent_count} sent
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {offer.redeemed_count} redeemed ({redemptionRate}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface-container-high)" }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(redemptionRate, 100)}%`,
                            background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Broadcast result */}
                    {broadcastDone && broadcast?.result && (
                      <div
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-3"
                        style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Sent to {broadcast.result.sent} customer{broadcast.result.sent !== 1 ? "s" : ""}
                        {broadcast.result.failed > 0 && ` · ${broadcast.result.failed} failed`}
                      </div>
                    )}
                    {broadcastErr && (
                      <div
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-3"
                        style={{ background: "#f443361a", color: "#f44336" }}
                      >
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Broadcast failed. Check your Twilio credentials.
                      </div>
                    )}

                    {/* Broadcast button / confirm */}
                    {confirmBroadcastId === offer.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmBroadcastId(null)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleBroadcast(offer.id)}
                          className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          Confirm Send
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmBroadcastId(offer.id)}
                        disabled={isBroadcasting}
                        className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isBroadcasting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send to All Customers
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* Create Offer Modal */}
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
            <h3 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>
              Create Offer
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    Offer Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Holiday Season Special"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    Discount *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                    placeholder="e.g. 25%"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    Valid Until
                  </label>
                  <input
                    type="text"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    placeholder="e.g. Dec 31 or Ongoing"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the offer for your customers..."
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
