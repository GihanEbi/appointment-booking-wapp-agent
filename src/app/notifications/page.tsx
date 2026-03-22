import { AppShell } from "@/components/layout/AppShell";
import { Bell, CheckCircle, Info, AlertTriangle, Zap } from "lucide-react";

const notifications = [
  { id: 1, type: "success", icon: CheckCircle, title: "Booking Confirmed", message: "Sarah Jenkins confirmed her hair styling appointment for tomorrow at 10 AM.", time: "2 minutes ago", color: "var(--tertiary)" },
  { id: 2, type: "info", icon: Zap, title: "AI Insight", message: "Conversion rate is up 12% today. Your AI agent handled 48 inquiries successfully.", time: "15 minutes ago", color: "var(--primary)" },
  { id: 3, type: "warning", icon: AlertTriangle, title: "Cancellation Alert", message: "James Carter canceled his Friday 2 PM appointment. Slot is now available.", time: "1 hour ago", color: "#f59e0b" },
  { id: 4, type: "info", icon: Info, title: "New Lead Captured", message: "Elena Rodriguez enquired about your holiday package via WhatsApp.", time: "2 hours ago", color: "var(--secondary)" },
  { id: 5, type: "success", icon: CheckCircle, title: "Offer Accepted", message: "Mark Thompson accepted the 'January Special' offer and booked a full package.", time: "3 hours ago", color: "var(--tertiary)" },
  { id: 6, type: "info", icon: Bell, title: "Daily Summary", message: "Your AI agent handled 127 messages today, resulting in 23 new bookings.", time: "Yesterday, 9 PM", color: "var(--primary)" },
];

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              System Notifications
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Stay updated with bookings, AI insights, and system alerts.
            </p>
          </div>
          <button
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--surface-container-low)", color: "var(--primary)" }}
          >
            Mark all read
          </button>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
        >
          {notifications.map((n, i) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                className="flex gap-4 px-5 py-4 transition-colors duration-150 hover:bg-[var(--surface-container-low)] cursor-pointer"
                style={{
                  borderBottom: i < notifications.length - 1 ? "1px solid var(--outline-variant)" : "none",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${n.color}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color: n.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                      {n.title}
                    </p>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      {n.time}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                    {n.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
