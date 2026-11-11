import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteAnalytics } from "@/components/analytics";
import { FONT_VARS } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "CulturePulse — Micro-culture Intelligence",
  description:
    "Monitor conversations and content across Reddit, TikTok, Instagram, Facebook, X, and Substack in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={FONT_VARS} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <SiteAnalytics />
      </body>
    </html>
  );
}
