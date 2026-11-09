import { cn } from "@/lib/utils";

/** The one CulturePulse mark — used by the marketing site and the app nav. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-[55%] w-[55%]">
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">CulturePulse</span>
    </span>
  );
}
