interface ActivityItemProps {
  name: string;
  message: string;
  time: string;
  type: "confirmed" | "inquiry" | "offer" | "insight";
  avatar: string;
}

const typeColors: Record<ActivityItemProps["type"], string> = {
  confirmed: "var(--primary)",
  inquiry: "var(--tertiary)",
  offer: "var(--secondary)",
  insight: "var(--primary-container)",
};

const typeBg: Record<ActivityItemProps["type"], string> = {
  confirmed: "var(--surface-container-low)",
  inquiry: "var(--surface-container-low)",
  offer: "var(--surface-container-low)",
  insight: "var(--primary-container)",
};

export function ActivityItem({ name, message, time, type, avatar }: ActivityItemProps) {
  return (
    <div className="flex gap-3 py-3 group">
      {/* Avatar or AI icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{
          background: type === "insight"
            ? "linear-gradient(135deg, var(--primary), var(--primary-container))"
            : `${typeColors[type]}22`,
          color: type === "insight" ? "white" : typeColors[type],
        }}
      >
        {type === "insight" ? "AI" : avatar}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-none mb-1" style={{ color: "var(--on-surface)" }}>
            {name}
          </p>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--on-surface-variant)" }}>
            {time}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
