"use client";

import { Radio, Bookmark, GitCompare, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavHeaderProps {
  onOpenSaved?: () => void;
  compareCount?: number;
  onOpenCompare?: () => void;
}

export function NavHeader({ onOpenSaved, compareCount = 0, onOpenCompare }: NavHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Search", exact: true },
    { href: "/dashboard/compare", label: "Compare" },
    { href: "/dashboard/audience", label: "Audience" },
    { href: "/dashboard/tracked", label: "Tracked" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Radio className="h-5 w-5 text-blue-400" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-sm hidden sm:inline">
            CulturePulse
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {navLinks.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
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

          <ThemeToggle />

          {/* User + sign out */}
          <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[140px]">
            {session?.user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
