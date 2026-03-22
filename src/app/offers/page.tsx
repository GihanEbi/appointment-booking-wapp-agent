import { AppShell } from "@/components/layout/AppShell";
import { Gift, Plus, Users, TrendingUp, Send } from "lucide-react";

const offers = [
  {
    id: 1,
    title: "Holiday Season Special",
    discount: "25% OFF",
    description: "Get 25% off on all services booked before December 24th. Valid for new and existing clients.",
    validUntil: "Dec 24, 2024",
    sent: 185,
    redeemed: 42,
    color: "var(--primary)",
    gradientFrom: "var(--primary)",
    gradientTo: "var(--primary-container)",
  },
  {
    id: 2,
    title: "VIP Members Exclusive",
    discount: "30% OFF",
    description: "Exclusive discount for our premium members on full-package services this January.",
    validUntil: "Jan 31, 2025",
    sent: 67,
    redeemed: 19,
    color: "var(--secondary)",
    gradientFrom: "var(--secondary)",
    gradientTo: "var(--secondary-container)",
  },
  {
    id: 3,
    title: "New Client Welcome",
    discount: "15% OFF",
    description: "First-time discount for all new clients who book via WhatsApp. Auto-sent on first inquiry.",
    validUntil: "Ongoing",
    sent: 328,
    redeemed: 94,
    color: "var(--tertiary)",
    gradientFrom: "var(--tertiary)",
    gradientTo: "var(--tertiary-container)",
  },
];

export default function OffersPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Marketing &amp; Offers Console
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Create and send special offers to your clients via WhatsApp AI.
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start">
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Offers", value: "3", icon: Gift, color: "var(--primary)" },
            { label: "Total Sent", value: "580", icon: Send, color: "var(--secondary)" },
            { label: "Total Redeemed", value: "155", icon: TrendingUp, color: "var(--tertiary)" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
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

        {/* Offer cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              {/* Gradient header */}
              <div
                className="p-5 flex items-center justify-between"
                style={{
                  background: `linear-gradient(135deg, ${offer.gradientFrom}, ${offer.gradientTo})`,
                }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    Special Offer
                  </p>
                  <p className="text-2xl font-black text-white mt-0.5">{offer.discount}</p>
                </div>
                <Gift className="w-8 h-8 text-white/60" />
              </div>

              <div className="p-5">
                <p className="font-bold text-sm mb-2" style={{ color: "var(--on-surface)" }}>
                  {offer.title}
                </p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--on-surface-variant)" }}>
                  {offer.description}
                </p>

                <div className="flex items-center justify-between text-xs mb-4" style={{ color: "var(--on-surface-variant)" }}>
                  <span>Valid until: {offer.validUntil}</span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {offer.sent} sent</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {offer.redeemed} redeemed</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface-container-high)" }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(offer.redeemed / offer.sent) * 100}%`,
                        background: `linear-gradient(90deg, ${offer.gradientFrom}, ${offer.gradientTo})`,
                      }}
                    />
                  </div>
                </div>

                <button
                  className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Again
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
