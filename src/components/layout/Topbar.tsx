"use client";

import { Bell, Sun, Moon, Monitor, Search, User } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useState } from "react";
import clsx from "clsx";

export function Topbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [notifCount] = useState(3);

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
    { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
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
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "transparent";
          }}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: "var(--surface-container-high)",
              color: "var(--on-surface-variant)",
            }}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
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
                    onClick={() => {
                      setTheme(opt.value);
                      setShowThemeMenu(false);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150",
                      theme === opt.value ? "font-semibold" : ""
                    )}
                    style={{
                      color: theme === opt.value ? "var(--primary)" : "var(--on-surface-variant)",
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
        <button
          className="w-9 h-9 flex items-center justify-center rounded-xl relative transition-all duration-200 hover:scale-105"
          style={{
            background: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ background: "var(--error)" }}
            >
              {notifCount}
            </span>
          )}
        </button>

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
