"use client";

import { Radio, Bookmark, GitCompare, CreditCard, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentPlan } from "@/hooks/use-billing";
import { PLANS } from "@/lib/plans";

interface NavHeaderProps {
  onOpenSaved?: () => void;
  compareCount?: number;
  onOpenCompare?: () => void;
}

export function NavHeader({ onOpenSaved, compareCount = 0, onOpenCompare }: NavHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const currentPlan = useCurrentPlan();
  const plan = PLANS[currentPlan];

  const navLinks = [
    { href: "/dashboard", label: "Search", exact: true },
    { href: "/dashboard/subcultures", label: "Library" },
    { href: "/dashboard/monitors", label: "Signals" },
    { href: "/dashboard/briefs", label: "Briefs" },
    { href: "/dashboard/compare", label: "Compare" },
    { href: "/dashboard/audience", label: "Audience" },
    { href: "/dashboard/brand-audit", label: "Brand Audit" },
    { href: "/dashboard/tracked", label: "Tracked" },
    { href: "/dashboard/workspace", label: "Workspace", agencyOnly: true },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Radio className="h-5 w-5 text-indigo-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-bold text-foreground tracking-tight text-sm">
              CulturePulse
            </span>
            <span className="text-[9px] font-medium text-muted-foreground tracking-wide uppercase mt-0.5">
              Social Intelligence Platform
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {navLinks.map((link) => {
            if ("agencyOnly" in link && link.agencyOnly && currentPlan !== "agency") return null;
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap",
                  active
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compare basket indicator */}
          {compareCount > 0 && (
            <Link href="/dashboard/compare">
              <Button variant="outline" size="sm" className="gap-1.5 relative">
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">Compare</span>
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {compareCount}
                </span>
              </Button>
            </Link>
          )}

          {/* Saved panel toggle */}
          {onOpenSaved && (
            <Button variant="ghost" size="icon" onClick={onOpenSaved} title="Saved searches">
              <Bookmark className="h-4 w-4" />
            </Button>
          )}

          {/* Plan badge + billing link */}
          <Link href="/dashboard/billing">
            <span className={cn(
              "hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors hover:opacity-80",
              currentPlan === "agency" ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
              currentPlan === "pro"    ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
              currentPlan === "starter"? "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" :
              "bg-muted text-muted-foreground border-border"
            )}>
              <CreditCard className="h-2.5 w-2.5" />
              {plan.name.toUpperCase()}
            </span>
          </Link>

          {/* User avatar + sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={`Sign out (${session?.user?.email})`}
            className="group relative h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 hover:bg-indigo-700 transition-colors"
          >
            {(session?.user?.name ?? session?.user?.email ?? "U").charAt(0).toUpperCase()}
            <span className="absolute -bottom-7 right-0 hidden group-hover:block text-[10px] bg-popover text-popover-foreground border border-border px-1.5 py-0.5 rounded whitespace-nowrap z-50 shadow">
              Sign out
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
