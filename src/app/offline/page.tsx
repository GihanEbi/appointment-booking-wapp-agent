import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ background: "var(--background)" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--surface-container-low)" }}>
        <WifiOff className="w-8 h-8" style={{ color: "var(--outline)" }} />
      </div>
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--on-surface)" }}>You&apos;re offline</h1>
        <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
          Check your connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary px-5 py-2.5 text-sm font-semibold">
        Retry
      </button>
    </div>
  );
}
