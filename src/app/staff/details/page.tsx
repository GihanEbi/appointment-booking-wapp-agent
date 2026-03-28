"use client";

import useSWR from "swr";
import { User, Mail, FileText, ShieldCheck, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StaffUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  is_active: boolean;
}

export default function StaffDetailsPage() {
  const { data: me, isLoading } = useSWR<StaffUser>("/api/staff/me", fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }

  if (!me) return null;

  const initials = me.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 w-full max-w-lg">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>My Details</h1>
        <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
          Your profile information — contact your admin to make changes.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.07)" }}>
        {/* Header gradient */}
        <div className="h-20" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }} />

        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white -mt-8 mb-3 shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "3px solid var(--background)" }}>
            {initials}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>{me.name}</h2>
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{me.email}</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ background: me.is_active ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: me.is_active ? "#16a34a" : "#92400e" }}>
              <span className={`w-1.5 h-1.5 rounded-full${me.is_active ? " animate-pulse" : ""}`}
                style={{ background: me.is_active ? "#22c55e" : "#f59e0b" }} />
              {me.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {me.bio && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>{me.bio}</p>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="rounded-2xl divide-y overflow-hidden"
        style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.07)", borderColor: "var(--outline-variant)" }}>
        {[
          { icon: User,      label: "Full Name", value: me.name },
          { icon: Mail,      label: "Email",     value: me.email },
          { icon: FileText,  label: "Bio",       value: me.bio || "No bio set" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-4 p-4"
            style={{ borderColor: "var(--outline-variant)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface-container-low)" }}>
              <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>{label}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--on-surface)" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl text-xs"
        style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
        <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary)" }} />
        This information is managed by your admin. Contact them to update your details.
      </div>

      <div className="h-16 lg:hidden" />
    </div>
  );
}
