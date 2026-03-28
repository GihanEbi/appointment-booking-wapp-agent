"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import {
  Users, Plus, Trash2, Loader2, X, Save, AlertTriangle,
  Mail, Lock, User, FileText, Eye, EyeOff, CheckCircle,
  ShieldCheck, Info,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SubUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  is_active: boolean;
  created_at: string;
}

export default function SubUsersPage() {
  const [showCreate, setShowCreate]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SubUser | null>(null);
  const [saving, setSaving]               = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [showPwd, setShowPwd]             = useState(false);

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio]           = useState("");

  const { data: rawSubUsers, mutate, isLoading } =
    useSWR<SubUser[]>("/api/staff-users", fetcher);
  const subUsers: SubUser[] = Array.isArray(rawSubUsers) ? rawSubUsers : [];

  function openCreate() {
    setName(""); setEmail(""); setPassword(""); setBio("");
    setShowPwd(false); setCreateError(null);
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    const res = await fetch("/api/staff-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, bio }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setShowCreate(false);
      await mutate();
    } else {
      setCreateError(data.error ?? "Failed to create sub user");
    }
  }

  async function handleDelete(user: SubUser) {
    setDeleteConfirm(null);
    setDeletingId(user.id);
    await fetch(`/api/staff-users/${user.id}`, { method: "DELETE" });
    mutate(subUsers.filter((u) => u.id !== user.id), { revalidate: false });
    setDeletingId(null);
  }

  return (
    <AppShell>
      <div className="space-y-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--on-surface)" }}>Sub Users</h1>
            <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
              Create staff accounts. Each sub user can view their own appointments and details.
            </p>
          </div>
          <button onClick={openCreate}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm self-start">
            <Plus className="w-4 h-4" />
            Add Sub User
          </button>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-3 p-4 rounded-2xl text-xs"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong>How sub users work:</strong> Sub users can log in at <strong>/staff/login</strong> with their email and password.
            They can only view their own dashboard and appointments. The AI agent will book appointments under a sub user's name
            when a customer requests a specific staff member. Sub users cannot make any changes.
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : subUsers.length === 0 ? (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "var(--surface-container-lowest)", border: "1.5px dashed var(--outline-variant)" }}>
            <Users className="w-9 h-9" style={{ color: "var(--outline)" }} />
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              No sub users yet. Add your first staff member.
            </p>
            <button onClick={openCreate}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
              Add Sub User
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subUsers.map((u) => (
              <SubUserCard
                key={u.id}
                user={u}
                deleting={deletingId === u.id}
                onDelete={() => setDeleteConfirm(u)}
              />
            ))}
          </div>
        )}

        <div className="h-16 lg:hidden" />
      </div>

      {/* ══ Create Modal ══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
              style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-container)", color: "var(--primary)" }}>
                  <User className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>New Sub User</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-5 space-y-4 rounded-b-2xl">
              {/* Error */}
              {createError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: "var(--error-container)", color: "var(--error)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {createError}
                </div>
              )}
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Full Name <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Email <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Password <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <input required type={showPwd ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--on-surface-variant)" }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>
                  Bio / Role
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4" style={{ color: "var(--outline)" }} />
                  <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Senior stylist, specialises in colour treatments"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none resize-none"
                    style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm Modal ══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl"
            style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 24px 48px rgba(20,29,36,0.2)" }}>
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--error-container)" }}>
                <AlertTriangle className="w-6 h-6" style={{ color: "var(--error)" }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: "var(--on-surface)" }}>Remove Sub User?</p>
                <p className="text-sm font-semibold mt-1" style={{ color: "var(--primary)" }}>{deleteConfirm.name}</p>
                <p className="text-sm mt-2" style={{ color: "var(--on-surface-variant)" }}>
                  This will permanently remove their account. Their past appointments will remain but will no longer be linked to them.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface-variant)" }}>
                  Keep
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ background: "var(--error)", color: "var(--on-error)" }}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SubUserCard({ user, deleting, onDelete }: {
  user: SubUser; deleting: boolean; onDelete: () => void;
}) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const created = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 8px 24px rgba(20,29,36,0.07)" }}>
      {/* Status strip */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{
          background: user.is_active ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.07)",
          borderBottom: `1px solid ${user.is_active ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.2)"}`,
        }}>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full${user.is_active ? " animate-pulse" : ""}`}
            style={{ background: user.is_active ? "#22c55e" : "#f59e0b" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: user.is_active ? "#16a34a" : "#92400e" }}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--outline)" }}>Joined {created}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: "var(--on-surface)" }}>{user.name}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--on-surface-variant)" }}>{user.email}</p>
          </div>
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--error)" }} />
          ) : (
            <button onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all hover:opacity-80"
              style={{ background: "var(--error-container)", color: "var(--error)" }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {user.bio && (
          <p className="text-xs mt-2.5 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{user.bio}</p>
        )}

        {/* Staff login hint */}
        <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          Logs in at <strong className="ml-0.5">/staff/login</strong>
        </div>
      </div>
    </div>
  );
}
