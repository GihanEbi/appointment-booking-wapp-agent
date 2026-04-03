interface AppointmentRowProps {
  name: string;
  service: string;
  time: string;
  status: "confirmed" | "pending" | "canceled" | "completed" | "overdue";
  avatar: string;
  phone: string;
}

const statusStyles: Record<AppointmentRowProps["status"], { bg: string; text: string; label: string }> = {
  confirmed: { bg: "var(--primary-container)",    text: "var(--on-primary-container)",  label: "Confirmed" },
  pending:   { bg: "var(--tertiary-container)",   text: "var(--on-tertiary-container)", label: "Pending"   },
  canceled:  { bg: "var(--error-container)",      text: "var(--error)",                 label: "Canceled"  },
  completed: { bg: "rgba(34,197,94,0.15)",        text: "#16a34a",                      label: "Completed" },
  overdue:   { bg: "rgba(249,115,22,0.15)",       text: "#ea580c",                      label: "Overdue"   },
};

export function AppointmentRow({ name, service, time, status, avatar, phone }: AppointmentRowProps) {
  const s = statusStyles[status];
  return (
    <div
      className="flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 hover:scale-[1.005] cursor-pointer group"
      style={{ background: "var(--surface-container-lowest)" }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
          color: "var(--on-primary)",
        }}
      >
        {avatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
            {name}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
          {service} · {phone}
        </p>
      </div>

      {/* Time */}
      <div className="hidden sm:block text-right">
        <p className="text-xs font-medium" style={{ color: "var(--on-surface)" }}>
          {time}
        </p>
      </div>

      {/* Status */}
      <span
        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.text }}
      >
        {s.label}
      </span>
    </div>
  );
}
