import { AppShell } from "@/components/layout/AppShell";
import { AppointmentRow } from "@/components/dashboard/AppointmentRow";
import { CalendarDays, Plus, Filter, Search } from "lucide-react";

const appointments = [
  { name: "Sarah Jenkins", service: "Hair Styling", time: "Today, 10:00 AM", status: "confirmed" as const, avatar: "SJ", phone: "+1 234 567 8900" },
  { name: "Daniel Kim", service: "Beard Trim", time: "Today, 3:30 PM", status: "pending" as const, avatar: "DK", phone: "+1 456 789 0123" },
  { name: "Priya Patel", service: "Facial Treatment", time: "Tomorrow, 11:00 AM", status: "confirmed" as const, avatar: "PP", phone: "+1 789 012 3456" },
  { name: "James Carter", service: "Full Package", time: "Fri, 2:00 PM", status: "canceled" as const, avatar: "JC", phone: "+1 321 654 9870" },
  { name: "Amelia Watson", service: "Colour & Style", time: "Sat, 9:00 AM", status: "confirmed" as const, avatar: "AW", phone: "+1 654 321 0987" },
  { name: "Raj Sharma", service: "Massage Therapy", time: "Sat, 1:00 PM", status: "pending" as const, avatar: "RS", phone: "+1 987 654 3210" },
  { name: "Lily Chen", service: "Nail Treatment", time: "Sun, 3:00 PM", status: "confirmed" as const, avatar: "LC", phone: "+1 111 222 3333" },
  { name: "Omar Hassan", service: "Hair Styling", time: "Mon, 10:30 AM", status: "confirmed" as const, avatar: "OH", phone: "+1 444 555 6666" },
];

export default function AppointmentsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Appointment Management Hub
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Manage all client bookings from your AI-powered WhatsApp agent.
            </p>
          </div>
          <button
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>

        {/* Filter bar */}
        <div
          className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 20px rgba(20,29,36,0.04)" }}
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
            <input
              type="text"
              placeholder="Search by name or service..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
              style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}
            />
          </div>
          <div className="flex gap-2">
            {["All", "Confirmed", "Pending", "Canceled"].map((f) => (
              <button
                key={f}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: f === "All" ? "var(--primary)" : "var(--surface-container-low)",
                  color: f === "All" ? "var(--on-primary)" : "var(--on-surface-variant)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments list */}
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" style={{ color: "var(--primary)" }} />
              <h2 className="font-bold" style={{ color: "var(--on-surface)" }}>All Appointments</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
              {appointments.length} total
            </span>
          </div>

          {appointments.map((appt) => (
            <AppointmentRow key={appt.name + appt.time} {...appt} />
          ))}
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
