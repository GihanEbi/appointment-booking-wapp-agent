"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, UserCircle2, LogOut, Zap, Menu } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

const NAV = [
  { href: "/staff/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { href: "/staff/appointments",  icon: CalendarDays,    label: "My Appointments" },
  { href: "/staff/details",       icon: UserCircle2,     label: "My Details" },
];

export function StaffShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <aside className="flex flex-col h-full rounded-2xl" style={{ background: "var(--surface-container-low)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none" style={{ color: "var(--on-surface)" }}>Staff Portal</p>
          {userName && (
            <p className="text-xs mt-0.5 truncate max-w-[140px]" style={{ color: "var(--on-surface-variant)" }}>{userName}</p>
          )}
        </div>
      </div>

      <div className="mx-4 h-px" style={{ background: "var(--outline-variant)", opacity: 0.4 }} />

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200", active ? "text-white" : "hover:bg-[var(--surface-container-high)]")}
              style={active
                ? { background: "linear-gradient(135deg, var(--primary), var(--primary-container))", color: "var(--on-primary)" }
                : { color: "var(--on-surface-variant)" }}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3" style={{ borderTop: "1px solid var(--outline-variant)" }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-red-500/10"
          style={{ color: "var(--error)" }}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full" style={{ background: "var(--surface-container-low)" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex p-3 w-64 flex-shrink-0">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="absolute left-0 top-0 bottom-0 w-64 p-3" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:m-3 lg:ml-0 overflow-hidden rounded-2xl"
        style={{ background: "var(--background)" }}>
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}>
          <button onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "var(--surface-container-low)", color: "var(--on-surface)" }}>
            <Menu className="w-4 h-4" />
          </button>
          <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>Staff Portal</p>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
