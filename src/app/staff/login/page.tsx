"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function StaffLoginPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // Verify the user is a staff member, not an admin
    const role = data.user?.app_metadata?.role;
    if (role !== "staff") {
      await supabase.auth.signOut();
      setError("This portal is for staff accounts only. Please use the admin login.");
      setLoading(false);
      return;
    }

    router.push("/staff/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
            <Zap className="w-7 h-7 text-white" fill="white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: "var(--on-surface)" }}>Staff Portal</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
              Sign in to your staff account
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: "var(--surface-container-lowest)", boxShadow: "0px 12px 32px rgba(20,29,36,0.08)" }}>
          <h2 className="text-base font-bold mb-1" style={{ color: "var(--on-surface)" }}>Welcome back</h2>
          <p className="text-xs mb-6" style={{ color: "var(--on-surface-variant)" }}>
            Enter your staff credentials to access your dashboard.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-sm"
              style={{ background: "var(--error-container)", color: "var(--error)" }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{ background: "var(--surface-container-low)", color: "var(--on-surface)", border: "2px solid transparent" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--on-surface-variant)" }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                <input type={showPwd ? "text" : "password"} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
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

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--outline)" }}>
          Staff portal · Concierge AI
        </p>
      </div>
    </div>
  );
}
