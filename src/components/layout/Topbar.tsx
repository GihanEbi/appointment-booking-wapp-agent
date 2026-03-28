"use client";

import {
  Bell,
  Sun,
  Moon,
  Monitor,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import clsx from "clsx";
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

function notifStyle(type: string) {
  if (type === "success") return { icon: CheckCircle, color: "var(--tertiary)" };
  if (type === "warning") return { icon: AlertTriangle, color: "#f59e0b" };
  if (type === "error")   return { icon: XCircle,      color: "#f44336" };
  return                         { icon: Info,          color: "var(--primary)" };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export function Topbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu]   = useState(false);
  const [showNotifs, setShowNotifs]         = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications, mutate } = useSWR<Notification[]>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000 }
  );

  const unread     = (notifications ?? []).filter((n) => !n.read_at);
  const latest5    = unread.slice(0, 5);
  const unreadCount = unread.length;

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  async function clearOne(id: string) {
    // Optimistically mark as read in local cache immediately
    mutate(
      (current: Notification[] | undefined) =>
        current?.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        ),
      { revalidate: false }
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    mutate();
  }

  async function clearAll() {
    const now = new Date().toISOString();
    // Optimistically mark all as read in local cache immediately
    mutate(
      (current: Notification[] | undefined) =>
        current?.map((n) => ({ ...n, read_at: n.read_at ?? now })),
      { revalidate: false }
    );
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  }

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }[] = [
    { value: "light",  icon: <Sun className="w-4 h-4" />,     label: "Light"  },
    { value: "dark",   icon: <Moon className="w-4 h-4" />,    label: "Dark"   },
    { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
  ];

  return (
    <header
      className="flex items-center gap-4 px-6 py-4 sticky top-0 z-10"
      style={{
        background: "var(--surface-container-low)",
        borderBottom: "1px solid",
        borderColor: "var(--outline-variant)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--on-surface-variant)" }}
        />
        <input
          type="text"
          placeholder="Search appointments, chats..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all duration-200"
          style={{
            background: "var(--surface-container-highest)",
            color: "var(--on-surface)",
            border: "2px solid transparent",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = "transparent";    }}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {showThemeMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemeMenu(false)} />
              <div
                className="absolute right-0 top-11 z-20 w-36 rounded-xl shadow-lg py-1 overflow-hidden"
                style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.12)" }}
              >
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); setShowThemeMenu(false); }}
                    className={clsx("w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150", theme === opt.value ? "font-semibold" : "")}
                    style={{
                      color:      theme === opt.value ? "var(--primary)" : "var(--on-surface-variant)",
                      background: theme === opt.value ? "var(--surface-container-low)" : "transparent",
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl relative transition-all duration-200 hover:scale-105"
            style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-0.5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ background: "var(--error, #f44336)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-11 z-20 w-80 rounded-2xl overflow-hidden shadow-xl"
              style={{
                background: "var(--surface-container-lowest)",
                boxShadow: "0px 16px 40px rgba(20,29,36,0.16)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--outline-variant)" }}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--primary)" }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Notification list */}
              {latest5.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-2 py-8 text-sm"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  <Bell className="w-8 h-8 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--outline-variant)" }}>
                  {latest5.map((n) => {
                    const { icon: Icon, color } = notifStyle(n.type);
                    return (
                      <div
                        key={n.id}
                        className="flex gap-3 px-4 py-3 transition-colors"
                        style={{ background: n.read_at ? "transparent" : `${color}08` }}
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}22` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug" style={{ color: "var(--on-surface)" }}>
                            {n.title}
                            {!n.read_at && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 mb-0.5 align-middle"
                                style={{ background: "var(--primary)" }}
                              />
                            )}
                          </p>
                          <p
                            className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                            style={{ color: "var(--on-surface-variant)" }}
                          >
                            {n.message}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)", opacity: 0.6 }}>
                            {timeAgo(n.created_at)}
                          </p>
                        </div>

                        {/* Clear single */}
                        <button
                          onClick={() => clearOne(n.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md mt-0.5 transition-colors hover:opacity-70"
                          style={{ color: "var(--on-surface-variant)" }}
                          aria-label="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div
                className="px-4 py-2.5"
                style={{ borderTop: "1px solid var(--outline-variant)" }}
              >
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70 w-full"
                  style={{ color: "var(--primary)" }}
                >
                  View all notifications
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 pl-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
              color: "var(--on-primary)",
            }}
          >
            SP
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none" style={{ color: "var(--on-surface)" }}>
              Studio Pulse
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>
              Premium
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
