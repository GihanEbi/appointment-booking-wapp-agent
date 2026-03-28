"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Bell,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function notifStyle(type: string) {
  if (type === "success")
    return { icon: CheckCircle, color: "var(--tertiary)" };
  if (type === "warning") return { icon: AlertTriangle, color: "#f59e0b" };
  if (type === "error") return { icon: XCircle, color: "#f44336" };
  return { icon: Info, color: "var(--primary)" };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [visibleCount, setVisibleCount] = useState(10);

  const {
    data: notifications,
    mutate,
    isLoading,
  } = useSWR<Notification[]>("/api/notifications", fetcher, {
    refreshInterval: 15000,
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  }

  return (
    <AppShell>
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--on-surface)" }}
            >
              System Notifications
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--on-surface-variant)" }}
            >
              Stay updated with bookings, AI insights, and system alerts.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "var(--surface-container-low)",
                color: "var(--primary)",
              }}
            >
              Mark all read ({unreadCount})
            </button>
          )}
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--surface-container-lowest)",
            boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
          }}
        >
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "var(--primary)" }}
              />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-16"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                No notifications yet. They&apos;ll appear as your AI agent
                handles bookings.
              </p>
            </div>
          ) : (
            <>
              {notifications.slice(0, visibleCount).map((n, i, arr) => {
                const { icon: Icon, color } = notifStyle(n.type);
                return (
                  <div
                    key={n.id}
                    className="flex gap-4 px-5 py-4 transition-colors duration-150 cursor-pointer"
                    style={{
                      borderBottom:
                        i < arr.length - 1
                          ? "1px solid var(--outline-variant)"
                          : "none",
                      background: n.read_at ? "transparent" : `${color}08`,
                    }}
                  >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}22` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--on-surface)" }}
                      >
                        {n.title}
                        {!n.read_at && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full ml-2 mb-0.5 align-middle"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                      </p>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })}
            {visibleCount < notifications.length && (
              <div 
                className="p-4 flex justify-center"
                style={{ borderTop: "1px solid var(--outline-variant)" }}
              >
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-80"
                  style={{
                    background: "var(--surface-container-high)",
                    color: "var(--on-surface)",
                  }}
                >
                  Show more
                </button>
              </div>
            )}
            </>
          )}
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
