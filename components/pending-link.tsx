"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A Link that shows a spinner from click until the next page renders,
 * so a CTA never feels dead while the route loads.
 */
export function PendingLink({
  children,
  className,
  arrow = false,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode; arrow?: boolean }) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      {...props}
      aria-busy={pending || undefined}
      className={cn(className, pending && "pointer-events-none")}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        setPending(true);
      }}
    >
      {children}
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : arrow ? (
        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      ) : null}
    </Link>
  );
}
