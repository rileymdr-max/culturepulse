"use client";

/**
 * One-click demo UI:
 *  - <DemoButton>  signs the visitor in as the shared read-only demo user.
 *  - <DemoBanner>  strip shown across the signed-in app while in the demo; also
 *                  catches "read-only demo" API refusals and explains them.
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_GO, CARD } from "@/components/marketing/brand";
import { DEMO_BLOCKED_CODE } from "@/lib/demo-policy";

export const BOOK_DEMO_HREF = "https://calendly.com/rileymdr/30min";

export function DemoButton({ className, children }: { className?: string; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
      onClick={() => {
        setPending(true);
        signIn("demo", { callbackUrl: "/dashboard" }).catch(() => setPending(false));
      }}
    >
      {children}
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    </button>
  );
}

/** Background requests whose refusal should fail quietly instead of opening the notice. */
const QUIET_PATHS = [/^\/api\/spike-content/, /^\/api\/tracked\/[^/]+\/snapshot/];

export function DemoBanner() {
  const { data: session } = useSession();
  const isDemo = !!session?.user?.isDemo;
  const [blocked, setBlocked] = useState(false);

  // Watch API responses for the middleware's read-only refusal.
  useEffect(() => {
    if (!isDemo) return;
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const res = await original(input, init);
      if (res.status === 403) {
        const url = new URL(
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
          window.location.origin
        );
        const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        if (method !== "GET" && !QUIET_PATHS.some((re) => re.test(url.pathname))) {
          const body = await res.clone().json().catch(() => null);
          if (body?.code === DEMO_BLOCKED_CODE) setBlocked(true);
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, [isDemo]);

  if (!isDemo) return null;

  return (
    <>
      <div className="border-b-2 border-[#111110] bg-[#FFE14D] text-[#111110]">
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
          <p>
            <span className="font-bold">You&rsquo;re exploring the live demo.</span>{" "}
            <span className="hidden sm:inline">Real signals, read-only. Running new searches and audits needs an account.</span>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={BOOK_DEMO_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline decoration-2 underline-offset-2 hover:text-[#0B6B45]"
            >
              Book a demo
            </a>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/register" })}
              className="rounded-full bg-[#111110] px-3.5 py-1.5 font-bold text-[#F2EDE3] hover:bg-[#2A2925]"
            >
              Start free
            </button>
          </div>
        </div>
      </div>

      {blocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-blocked-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/40 p-4"
          onClick={() => setBlocked(false)}
        >
          <div className={cn(CARD, "relative w-full max-w-md p-6 text-[#111110]")} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setBlocked(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-[#F2EDE3]"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="demo-blocked-title" className="font-[family-name:var(--font-display)] text-3xl uppercase">
              That&rsquo;s a live run
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#3B3832]">
              The demo is read-only, so it can&rsquo;t run new searches, audits or briefs. Create a free account to
              run your own, or book a walkthrough and we&rsquo;ll run it with you.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/register" })}
                className={cn(BTN_GO, "px-6 py-3 text-base")}
              >
                Start free
              </button>
              <a
                href={BOOK_DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#0B6B45] underline decoration-2 underline-offset-2 hover:text-[#111110]"
              >
                Book a demo
              </a>
              <Link href="/dashboard" onClick={() => setBlocked(false)} className="ml-auto text-sm text-[#5E5A52] hover:text-[#111110]">
                Keep exploring
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
