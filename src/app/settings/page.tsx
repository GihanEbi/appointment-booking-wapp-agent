import { AppShell } from "@/components/layout/AppShell";
import { Settings, Bell, Bot, Globe, Shield, Palette } from "lucide-react";

const settingsSections = [
  {
    icon: Bot,
    title: "AI Agent Configuration",
    description: "Customize how your WhatsApp AI agent responds to clients.",
    settings: [
      { label: "AI Response Tone", value: "Professional & Friendly", type: "select" },
      { label: "Auto-Reply Delay", value: "2 seconds", type: "select" },
      { label: "Working Hours", value: "9:00 AM – 7:00 PM", type: "text" },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Control which alerts you receive and how.",
    settings: [
      { label: "New Booking Alerts", value: true, type: "toggle" },
      { label: "Cancellation Alerts", value: true, type: "toggle" },
      { label: "Daily AI Summary", value: true, type: "toggle" },
      { label: "Marketing Performance", value: false, type: "toggle" },
    ],
  },
  {
    icon: Globe,
    title: "WhatsApp Integration",
    description: "Manage your WhatsApp Business API connection.",
    settings: [
      { label: "Phone Number", value: "+1 234 567 8900", type: "text" },
      { label: "Business Name", value: "Studio Pulse", type: "text" },
      { label: "Connection Status", value: "Connected", type: "status" },
    ],
  },
  {
    icon: Shield,
    title: "Security & Access",
    description: "Manage passwords, sessions, and access control.",
    settings: [
      { label: "Two-Factor Authentication", value: true, type: "toggle" },
      { label: "Session Timeout", value: "30 minutes", type: "select" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
            Configure your AI agent, integrations, and account preferences.
          </p>
        </div>

        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.06)" }}
            >
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: "1px solid var(--outline-variant)", opacity: 1 }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{section.title}</p>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{section.description}</p>
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: "var(--outline-variant)" }}>
                {section.settings.map((s: { label: string; value: string | boolean; type: string }) => (
                  <div key={s.label} className="flex items-center justify-between px-5 py-3.5">
                    <p className="text-sm" style={{ color: "var(--on-surface)" }}>{s.label}</p>

                    {s.type === "toggle" && (
                      <button
                        className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                        style={{
                          background: s.value ? "linear-gradient(135deg, var(--primary), var(--primary-container))" : "var(--surface-container-high)",
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                          style={{
                            background: "white",
                            left: s.value ? "calc(100% - 1.375rem)" : "0.125rem",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          }}
                        />
                      </button>
                    )}

                    {(s.type === "text" || s.type === "select") && (
                      <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
                        {s.value as string}
                      </p>
                    )}

                    {s.type === "status" && (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
                      >
                        {s.value as string}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="h-16 lg:hidden" />
      </div>
    </AppShell>
  );
}
