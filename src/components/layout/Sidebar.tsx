"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  MessageCircle,
  Bell,
  Megaphone,
  Gift,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  Users,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/my-details", icon: UserCircle2, label: "My Details" },
  { href: "/appointments", icon: CalendarDays, label: "Appointments" },
  { href: "/ai-chats", icon: MessageCircle, label: "AI Chats" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/offers", icon: Gift, label: "Send Offers" },
  { href: "/sub-users", icon: Users, label: "Sub Users" },
];

const bottomItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-full transition-all duration-300 ease-in-out",
        "rounded-2xl",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: "var(--surface-container-low)" }}
    >
      {/* Logo */}
      <div
        className={clsx(
          "flex items-center gap-3 px-4 py-5",
          collapsed && "justify-center px-2"
        )}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
          }}
        >
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p
              className="font-bold text-sm leading-none"
              style={{ color: "var(--on-surface)" }}
            >
              Concierge AI
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
              WhatsApp Booking
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: "var(--outline-variant)", opacity: 0.4 }} />

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                collapsed && "justify-center px-2",
                active
                  ? "text-white"
                  : "hover:bg-[var(--surface-container-high)]"
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, var(--primary), var(--primary-container))",
                      color: "var(--on-primary)",
                    }
                  : { color: "var(--on-surface-variant)" }
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {active && !collapsed && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-70"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-2 py-3 space-y-1 border-t" style={{ borderColor: "var(--outline-variant)" }}>
        {bottomItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "hover:bg-[var(--surface-container-high)]",
              collapsed && "justify-center px-2"
            )}
            style={{ color: "var(--on-surface-variant)" }}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </Link>
        ))}

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "hover:bg-red-500/10",
              collapsed && "justify-center px-2"
            )}
            style={{ color: "var(--error)" }}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </form>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110"
        style={{
          background: "var(--surface-container-lowest)",
          color: "var(--on-surface-variant)",
          border: "1px solid var(--outline-variant)",
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
