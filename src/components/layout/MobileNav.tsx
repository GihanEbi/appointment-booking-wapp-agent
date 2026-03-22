"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, MessageCircle, Bell, Gift } from "lucide-react";
import clsx from "clsx";

const mobileNav = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/appointments", icon: CalendarDays, label: "Bookings" },
  { href: "/ai-chats", icon: MessageCircle, label: "AI Chats" },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/offers", icon: Gift, label: "Offers" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 safe-area-pb"
      style={{
        background: "var(--surface-container-lowest)",
        borderTop: "1px solid",
        borderColor: "var(--outline-variant)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      }}
    >
      {mobileNav.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-[48px] transition-all duration-200"
            style={{ color: active ? "var(--primary)" : "var(--on-surface-variant)" }}
          >
            <div
              className={clsx(
                "w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200",
                active && "scale-110"
              )}
              style={active ? { background: "var(--surface-container-low)" } : {}}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
