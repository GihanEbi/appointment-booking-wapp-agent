"use client";

import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentRow } from "@/components/dashboard/AppointmentRow";
import {
  CalendarDays,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  ArrowRight,
  Bell,
  AlertTriangle,
  Info,
} from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifIcon(type: string) {
  if (type === "success") return CheckCircle;
  if (type === "warning") return AlertTriangle;
  if (type === "error") return XCircle;
  return Info;
}

function notifColor(type: string) {
  if (type === "success") return "var(--tertiary)";
  if (type === "warning") return "#f59e0b";
  if (type === "error") return "#f44336";
  return "var(--primary)";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatApptTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  scheduled_at: string;
  status: "confirmed" | "pending" | "canceled";
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

interface Stats {
  total: number;
  confirmed: number;
  canceled: number;
  sessions: number;
  upcoming: Appointment[];
}

export default function DashboardPage() {
  const { data: stats } = useSWR<Stats>("/api/dashboard/stats", fetcher, {
    refreshInterval: 30000,
  });
  const { data: notifications } = useSWR<Notification[]>("/api/notifications", fetcher, {
    refreshInterval: 30000,
  });

  const statCards = [
    {
      title: "Total Appointments",
      value: stats?.total?.toLocaleString() ?? "—",
      icon: CalendarDays,
      iconColor: "var(--primary)",
    },
    {
      title: "New Leads (Chats)",
      value: stats?.sessions?.toLocaleString() ?? "—",
      icon: Users,
      iconColor: "var(--tertiary)",
    },
    {
      title: "Successful Bookings",
      value: stats?.confirmed?.toLocaleString() ?? "—",
      icon: CheckCircle,
      iconColor: "var(--secondary)",
    },
    {
      title: "Cancellations",
      value: stats?.canceled?.toLocaleString() ?? "—",
      icon: XCircle,
      iconColor: "#f44336",
    },
  ];

  const upcoming = stats?.upcoming ?? [];
  const recentNotifs = (notifications ?? []).slice(0, 5);

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
          {statCards.map((stat) => (
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
                  {upcoming.length > 0
                    ? `Showing ${upcoming.length} upcoming`
                    : "No upcoming appointments"}
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

            {upcoming.length === 0 ? (
              <div
                className="text-center py-10 text-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                No upcoming appointments yet. They&apos;ll appear here once customers book via WhatsApp.
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    name={appt.customer_name}
                    service={appt.service}
                    time={formatApptTime(appt.scheduled_at)}
                    status={appt.status}
                    avatar={initials(appt.customer_name)}
                    phone={appt.customer_phone}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity (Notifications) */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--surface-container-lowest)",
              boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
                Recent Activity
              </h2>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <Link
                  href="/notifications"
                  className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--primary)" }}
                >
                  All
                </Link>
              </div>
            </div>

            {recentNotifs.length === 0 ? (
              <div
                className="text-center py-8 text-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                Activity will appear here as your AI agent handles bookings.
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifs.map((n) => {
                  const Icon = notifIcon(n.type);
                  const color = notifColor(n.type);
                  return (
                    <div key={n.id} className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${color}22` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--on-surface)" }}>
                          {n.title}
                        </p>
                        <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>
                          {n.message}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)", opacity: 0.7 }}>
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              {stats?.confirmed ?? 0} confirmed
            </div>
          </div>

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
            <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>30 days ago</span>
            <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Today</span>
          </div>
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
