import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { AppointmentRow } from "@/components/dashboard/AppointmentRow";
import {
  CalendarDays,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { title: "Total Appointments", value: "1,284", change: "8.2%", changePositive: true, icon: CalendarDays, iconColor: "var(--primary)" },
  { title: "New Leads", value: "452", change: "12.1%", changePositive: true, icon: Users, iconColor: "var(--tertiary)" },
  { title: "Successful Bookings", value: "1,180", change: "5.4%", changePositive: true, icon: CheckCircle, iconColor: "var(--secondary)" },
  { title: "Cancellations", value: "14", change: "2.3%", changePositive: false, icon: XCircle, iconColor: "#f44336" },
];

const recentActivity = [
  {
    name: "Sarah Jenkins",
    message: "Confirmed a hair styling appointment for tomorrow at 10 AM via AI Bot.",
    time: "2m ago",
    type: "confirmed" as const,
    avatar: "SJ",
  },
  {
    name: "Mark Thompson",
    message: "AI handling inquiry about membership pricing and available slots.",
    time: "15m ago",
    type: "inquiry" as const,
    avatar: "MT",
  },
  {
    name: "Elena Rodriguez",
    message: 'Responded to the "Holiday Special" offer. Requesting more details.',
    time: "1h ago",
    type: "offer" as const,
    avatar: "ER",
  },
  {
    name: "AI Insight",
    message: "Conversion is up 12% today. Consider sending a broadcast to your VIP list.",
    time: "2h ago",
    type: "insight" as const,
    avatar: "AI",
  },
];

const upcomingAppointments = [
  { name: "Sarah Jenkins", service: "Hair Styling", time: "Tomorrow, 10:00 AM", status: "confirmed" as const, avatar: "SJ", phone: "+1 234 567 8900" },
  { name: "Daniel Kim", service: "Beard Trim", time: "Today, 3:30 PM", status: "pending" as const, avatar: "DK", phone: "+1 456 789 0123" },
  { name: "Priya Patel", service: "Facial Treatment", time: "Thu, 11:00 AM", status: "confirmed" as const, avatar: "PP", phone: "+1 789 012 3456" },
  { name: "James Carter", service: "Full Package", time: "Fri, 2:00 PM", status: "canceled" as const, avatar: "JC", phone: "+1 321 654 9870" },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
              Dashboard Overview
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Welcome back! Here&apos;s what&apos;s happening with your AI agent today.
            </p>
          </div>

          {/* AI Status Chip */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">AI Active</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Upcoming Appointments */}
          <div
            className="xl:col-span-2 rounded-2xl p-5"
            style={{
              background: "var(--surface-container-lowest)",
              boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
                  Upcoming Appointments
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                  Showing 4 of 42 upcoming
                </p>
              </div>
              <Link
                href="/appointments"
                className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: "var(--primary)" }}
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {upcomingAppointments.map((appt) => (
                <AppointmentRow key={appt.name} {...appt} />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--surface-container-lowest)",
              boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
                Recent Activity
              </h2>
              <Zap className="w-4 h-4" style={{ color: "var(--primary)" }} />
            </div>

            <div className="divide-y" style={{ borderColor: "var(--outline-variant)", opacity: 1 }}>
              {recentActivity.map((item) => (
                <ActivityItem key={item.name + item.time} {...item} />
              ))}
            </div>
          </div>
        </div>

        {/* Trend chart placeholder */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--surface-container-lowest)",
            boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
                Appointment Trends
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                Daily activity for the last 30 days
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--tertiary)" }}>
              <TrendingUp className="w-4 h-4" />
              +12% this period
            </div>
          </div>

          {/* Simple bar chart visualization */}
          <div className="flex items-end gap-1 h-32 px-2">
            {Array.from({ length: 30 }, (_, i) => {
              const heights = [45, 60, 35, 70, 55, 80, 65, 40, 75, 90, 55, 70, 85, 60, 45, 95, 75, 60, 80, 70, 55, 90, 85, 70, 65, 80, 95, 75, 88, 100];
              const h = heights[i] || 50;
              const isHighlighted = i >= 25;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${h}%`,
                    background: isHighlighted
                      ? "linear-gradient(180deg, var(--primary), var(--primary-container))"
                      : "var(--surface-container-high)",
                    minWidth: 0,
                  }}
                />
              );
            })}
          </div>

          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Feb 20</span>
            <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Mar 22</span>
          </div>
        </div>

        {/* Spacer for mobile nav */}
        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
