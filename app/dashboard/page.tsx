"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search,
  Radio,
  Users,
  BookOpen,
  FileText,
  ArrowRight,
  Clock,
  TrendingUp,
  Layers,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";

const RECENT_SEARCHES_KEY = "speedbag:recent-searches";
const AUDIT_SESSION_KEY = "culturepulse-audience-audit";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
  } catch { return []; }
}

function hasActiveAudit(): boolean {
  try {
    const raw = sessionStorage.getItem(AUDIT_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed?.audit || parsed?.audience);
  } catch { return false; }
}

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const first = name?.split(" ")[0];
  return first ? `Good ${time}, ${first}` : `Good ${time}`;
}

const ACTIONS = [
  {
    href: "/dashboard/search",
    icon: Search,
    label: "New Search",
    description: "Find micro-communities across Reddit, X, TikTok, and more",
    accent: "indigo",
  },
  {
    href: "/dashboard/brand-audit",
    icon: Users,
    label: "Audience Audit",
    description: "Map a brand's subculture DNA and surface new community fits",
    accent: "violet",
  },
  {
    href: "/dashboard/monitors",
    icon: Radio,
    label: "Signals",
    description: "Track trends and momentum across your monitored communities",
    accent: "emerald",
  },
  {
    href: "/dashboard/briefs",
    icon: FileText,
    label: "Briefs",
    description: "Generate and review content briefs from your signal data",
    accent: "amber",
  },
  {
    href: "/dashboard/subcultures",
    icon: Layers,
    label: "Library",
    description: "Browse and manage the full subculture profile collection",
    accent: "sky",
  },
] as const;

type Accent = (typeof ACTIONS)[number]["accent"];

const ACCENT_STYLES: Record<Accent, { card: string; icon: string; arrow: string }> = {
  indigo: {
    card: "hover:border-indigo-500/40 hover:bg-indigo-500/5",
    icon: "bg-indigo-500/15 text-indigo-400",
    arrow: "text-indigo-400",
  },
  violet: {
    card: "hover:border-violet-500/40 hover:bg-violet-500/5",
    icon: "bg-violet-500/15 text-violet-400",
    arrow: "text-violet-400",
  },
  emerald: {
    card: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
    icon: "bg-emerald-500/15 text-emerald-400",
    arrow: "text-emerald-400",
  },
  amber: {
    card: "hover:border-amber-500/40 hover:bg-amber-500/5",
    icon: "bg-amber-500/15 text-amber-400",
    arrow: "text-amber-400",
  },
  sky: {
    card: "hover:border-sky-500/40 hover:bg-sky-500/5",
    icon: "bg-sky-500/15 text-sky-400",
    arrow: "text-sky-400",
  },
};

export default function WelcomePage() {
  const { data: session } = useSession();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [auditActive, setAuditActive] = useState(false);

  useEffect(() => {
    setRecentSearches(getRecentSearches().slice(0, 4));
    setAuditActive(hasActiveAudit());
  }, []);

  const greeting = getGreeting(session?.user?.name ?? session?.user?.email);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {greeting}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Where would you like to start?
          </p>
        </div>

        {/* Continue section — only shown when there's something to continue */}
        {(auditActive || recentSearches.length > 0) && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Continue where you left off
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {auditActive && (
                <Link
                  href="/dashboard/brand-audit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-sm text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/50 transition-all duration-150"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Resume Audience Audit
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
              )}
              {recentSearches.map((q) => (
                <Link
                  key={q}
                  href={`/dashboard/search?q=${encodeURIComponent(q)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground hover:text-foreground hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-150"
                >
                  <Search className="h-3.5 w-3.5" />
                  {q}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Primary action grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.map((action) => {
            const styles = ACCENT_STYLES[action.accent];
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex flex-col gap-4 p-5 rounded-xl border border-border bg-card transition-all duration-200 ${styles.card}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${styles.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 ${styles.arrow}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
