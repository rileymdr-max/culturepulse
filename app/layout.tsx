import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteAnalytics } from "@/components/analytics";
import { FONT_VARS } from "@/components/marketing/brand";

const SITE_URL = "https://www.culture-pulse.com";
const TITLE = "CulturePulse — Micro-culture Intelligence";
const DESCRIPTION =
  "Every trend starts as a subculture nobody's watching. CulturePulse scores which micro-communities are about to break out and writes the brief your team needs to show up first.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "CulturePulse",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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
