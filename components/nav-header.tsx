"use client";

import { Bookmark, CreditCard } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentPlan } from "@/hooks/use-billing";
import { PLANS } from "@/lib/plans";
import { useQuery } from "@tanstack/react-query";

interface NavHeaderProps {
  onOpenSaved?: () => void;
}

export function NavHeader({ onOpenSaved }: NavHeaderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const currentPlan = useCurrentPlan();
  const plan = PLANS[currentPlan];
  const isAdminUser = session?.user?.email === "rileymdr@gmail.com";

  // Admin only: how many sign-ups are waiting for approval (badge on "Admin").
  const { data: pendingSignups = 0 } = useQuery({
    queryKey: ["admin-pending-signups"],
    enabled: isAdminUser,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return 0;
      const d = await res.json();
      return (d.pending?.length as number) ?? 0;
    },
  });

  const navLinks = [
    { href: "/dashboard/search", label: "Search" },
    { href: "/dashboard/subcultures", label: "Library" },
    { href: "/dashboard/monitors", label: "Signals" },
    { href: "/dashboard/briefs", label: "Briefs" },
    { href: "/dashboard/brand-audit", label: "Audience Audit" },
    { href: "/dashboard/workspace", label: "Workspace", agencyOnly: true },
    { href: "/dashboard/admin", label: "Admin", adminOnly: true },
  ];

  return (
    <header className="sticky top-0 z-30 print:hidden border-b-2 border-foreground bg-background/90 backdrop-blur-md">
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
            if ("agencyOnly" in link && link.agencyOnly && PLANS[currentPlan].limits.workspaces === 0) return null;
            const active = "exact" in link && link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href === "/dashboard/admin" && pendingSignups > 0 ? "/dashboard/admin?tab=signups" : link.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-accent text-accent-foreground font-bold ring-[1.5px] ring-inset ring-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                {link.label}
                {link.href === "/dashboard/admin" && pendingSignups > 0 && (
                  <span
                    className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFE14D] px-1.5 text-[11px] font-bold tabular-nums text-[#111110] ring-[1.5px] ring-inset ring-[#111110]"
                    title={`${pendingSignups} sign-up${pendingSignups === 1 ? "" : "s"} waiting for approval`}
                  >
                    {pendingSignups}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
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
              currentPlan === "enterprise" ? "bg-foreground text-background border-foreground" :
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
