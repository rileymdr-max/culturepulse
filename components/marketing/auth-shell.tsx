import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND_ROOT, CARD, D, M, STICKER, WordmarkLink } from "./brand";

/**
 * Sign in / sign up frame in the F2 brand: poster headline on the left
 * (desktop), the form card on the right. On phones the headline shrinks
 * to a short line above the card.
 */
export function AuthShell({
  headline,
  title,
  subtitle,
  switchPrompt,
  switchHref,
  switchLabel,
  children,
}: {
  headline: ReactNode;
  title: string;
  subtitle: string;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(BRAND_ROOT, "flex min-h-screen flex-col overflow-x-hidden")}>
      <header className="border-b-2 border-[#111110]">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-11">
          <WordmarkLink />
          <p className="text-[15px]">
            <span className="hidden text-[#66625A] sm:inline">{switchPrompt} </span>
            <Link href={switchHref} className="font-bold hover:text-[#0B6B45]">
              {switchLabel}
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1360px] flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-11 lg:py-16">
        <div className="hidden lg:block">
          <h2 className={cn(D, "text-[88px] leading-[0.9] xl:text-[104px]")}>{headline}</h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <span className={cn(STICKER, "-rotate-3 bg-[#BBA8FF]")}>Quiet luxury 84</span>
            <span className={cn(STICKER, "rotate-2 bg-[#FFE14D]")}>Dark academia 61</span>
            <span className={cn(STICKER, "-rotate-1 bg-[#C7F2D9]")}>Van life 47</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          <div className={cn(CARD, "p-7 sm:p-8")}>
            <h1 className={cn(D, "text-4xl leading-none")}>{title}</h1>
            <p className="mt-2 text-[15px] text-[#4A463F]">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-6 text-center text-[15px] text-[#66625A] sm:hidden">
            {switchPrompt}{" "}
            <Link href={switchHref} className="font-bold text-[#0B6B45]">
              {switchLabel}
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t-2 border-[#111110]">
        <p className={cn(M, "mx-auto max-w-[1360px] px-4 py-5 text-xs text-[#66625A] sm:px-6 lg:px-11")}>
          © {new Date().getFullYear()} CulturePulse
        </p>
      </footer>
    </div>
  );
}

/** Inline error / notice used inside auth and onboarding forms. */
export function FormNotice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 rounded-xl border-2 border-[#111110] px-4 py-3 text-[15px]",
        tone === "error" ? "bg-[#FFD9D2] text-[#7A1B0C]" : "bg-[#C7F2D9] text-[#0B4A30]"
      )}
    >
      {children}
    </div>
  );
}
