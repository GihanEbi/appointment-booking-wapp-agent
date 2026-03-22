import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Concierge AI — WhatsApp Booking Agent",
  description:
    "Manage your AI-powered WhatsApp booking agent. View appointments, broadcast messages, and monitor AI conversations — all from one premium dashboard.",
  keywords: ["WhatsApp", "booking", "AI agent", "appointments", "concierge"],
  authors: [{ name: "Techneura" }],
  openGraph: {
    title: "Concierge AI — WhatsApp Booking Agent",
    description: "Premium AI-powered WhatsApp booking management dashboard.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6faff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
