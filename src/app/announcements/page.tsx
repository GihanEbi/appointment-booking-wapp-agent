import { AppShell } from "@/components/layout/AppShell";
import { Megaphone, Plus, Clock, CheckCircle, Users, Eye } from "lucide-react";

const announcements = [
  {
    id: 1,
    title: "Holiday Season Hours Update",
    message: "Dear valued clients, we will be operating on extended hours during the holiday season (Dec 20 – Jan 3). Book your slots early!",
    audience: "All Clients",
    scheduledFor: "Dec 15, 2024 · 10:00 AM",
    status: "scheduled",
    reach: 285,
  },
  {
    id: 2,
    title: "New Service: Hot Stone Massage",
    message: "We are thrilled to announce our brand new Hot Stone Massage therapy! Book your introductory session at 30% off this month.",
    audience: "Premium Members",
    scheduledFor: "Nov 28, 2024 · 2:00 PM",
    status: "sent",
    reach: 142,
  },
  {
    id: 3,
    title: "Year-End Maintenance Closure",
    message: "We will be closed on December 31st for annual maintenance. All bookings on this date have been rescheduled.",
    audience: "Affected Clients",
    scheduledFor: "Dec 10, 2024 · 9:00 AM",
    status: "sent",
    reach: 37,
  },
];

const statusStyle: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  scheduled: { bg: "var(--tertiary-container)", text: "var(--on-tertiary-container)", icon: Clock },
  sent: { bg: "var(--primary-container)", text: "var(--on-primary-container)", icon: CheckCircle },
};

export default function AnnouncementsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              AI Announcements &amp; Rules
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Broadcast important updates to your clients via WhatsApp AI.
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start">
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        <div className="space-y-4">
          {announcements.map((a) => {
            const s = statusStyle[a.status];
            const StatusIcon = s.icon;
            return (
              <div
                key={a.id}
                className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.005] cursor-pointer"
                style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
                    >
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{a.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>{a.scheduledFor}</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: s.bg, color: s.text }}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {a.status === "scheduled" ? "Scheduled" : "Sent"}
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--on-surface-variant)" }}>
                  {a.message}
                </p>

                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {a.audience}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {a.reach} reached
                  </span>
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
