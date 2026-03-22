import clsx from "clsx";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  change,
  changePositive = true,
  icon: Icon,
  iconColor,
}: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "var(--surface-container-lowest)",
        boxShadow: "0px 12px 32px rgba(20,29,36,0.06)",
      }}
    >
      {/* Background decoration */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 translate-x-8 -translate-y-8"
        style={{ background: iconColor || "var(--primary)" }}
      />

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--on-surface-variant)" }}>
          {title}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor || "var(--primary)"}22` }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor || "var(--primary)" }} />
        </div>
      </div>

      <div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--on-surface)" }}
        >
          {value}
        </p>
        {change && (
          <p
            className="text-xs mt-1 font-medium"
            style={{
              color: changePositive ? "var(--tertiary)" : "var(--error)",
            }}
          >
            {changePositive ? "↑" : "↓"} {change} vs last month
          </p>
        )}
      </div>
    </div>
  );
}
