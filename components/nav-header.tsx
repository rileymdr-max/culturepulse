"use client";

import { Bookmark, GitCompare, CreditCard } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const currentPlan = useCurrentPlan();
  const plan = PLANS[currentPlan];

  const navLinks = [
    { href: "/dashboard/search", label: "Search" },
    { href: "/dashboard/subcultures", label: "Library" },
    { href: "/dashboard/monitors", label: "Signals" },
    { href: "/dashboard/briefs", label: "Briefs" },
    { href: "/dashboard/compare", label: "Compare" },
    { href: "/dashboard/brand-audit", label: "Audience Audit" },
    { href: "/dashboard/workspace", label: "Workspace", agencyOnly: true },
    { href: "/dashboard/admin", label: "Admin", adminOnly: true },
  ];

  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/90 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center shrink-0" aria-label="CulturePulse home">
          <LogoMark className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {navLinks.map((link) => {
            if ("adminOnly" in link && link.adminOnly && session?.user?.email !== "rileymdr@gmail.com") return null;
            if ("agencyOnly" in link && link.agencyOnly && currentPlan !== "agency") return null;
            const active = "exact" in link && link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-accent text-accent-foreground font-bold ring-[1.5px] ring-inset ring-foreground"
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
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums flex items-center justify-center">
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
          {/* Hidden until the session loads, so paid plans never flash "FREE" */}
          {status === "authenticated" && (
          <Link href="/dashboard/billing">
            <span className={cn(
              "hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors hover:opacity-80",
              currentPlan === "agency" ? "bg-[#BBA8FF] text-foreground border-foreground" :
              currentPlan === "pro"    ? "bg-[#FFE14D] text-foreground border-foreground" :
              currentPlan === "starter"? "bg-accent text-accent-foreground border-foreground" :
              "bg-muted text-muted-foreground border-border"
            )}>
              <CreditCard className="h-2.5 w-2.5" />
              {plan.name.toUpperCase()}
            </span>
          </Link>
          )}

          {/* User avatar + sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={`Sign out (${session?.user?.email})`}
            className="group relative h-7 w-7 rounded-full bg-primary border-[1.5px] border-foreground flex items-center justify-center text-white text-xs font-bold shrink-0 hover:bg-primary/90 transition-colors"
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
