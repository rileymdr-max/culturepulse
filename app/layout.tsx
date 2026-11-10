import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteAnalytics } from "@/components/analytics";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <SiteAnalytics />
      </body>
    </html>
  );
}
