import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup — AI Booking Agent",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {children}
    </div>
  );
}
