import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FitBuddy | AI Fitness Plan Generator",
    template: "%s · FitBuddy",
  },
  description:
    "Personalized AI fitness plans, workout tracking, and analytics powered by Gemini.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}