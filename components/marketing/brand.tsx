import Link from "next/link";
import { Anton, DM_Sans, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

/* ── F2 marketing brand ────────────────────────────────────────────
   Poster type (Anton) on warm paper with deep green. Used by the
   logged-out homepage, sign in, sign up and onboarding. Scoped to
   those pages so the signed-in app keeps its design-system tokens. */

const display = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const mono = JetBrains_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap", variable: "--font-mono" });

/** Root classes: font variables, paper background, ink text. */
export const BRAND_ROOT = cn(
  display.variable,
  body.variable,
  mono.variable,
  "bg-[#F2EDE3] font-[family-name:var(--font-body)] text-[#111110] antialiased"
);

/* Class recipes */
export const D = "font-[family-name:var(--font-display)] font-normal uppercase";
export const M = "font-[family-name:var(--font-mono)]";
export const CARD = "rounded-[18px] border-2 border-[#111110] bg-[#FFFDF8] shadow-[8px_8px_0_#111110]";
export const BTN_GO =
  "group inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-[#0B6B45] px-7 py-4 text-[17px] font-bold text-white shadow-[4px_4px_0_#111110] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#111110] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#111110] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B6B45] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#111110]";
export const BTN_INK =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#111110] px-5 py-2.5 text-[15px] font-bold text-[#F2EDE3] transition-colors hover:bg-[#2A2925] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B45]";
export const STICKER =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#111110] px-4 py-2 text-[15px] font-bold shadow-[3px_3px_0_#111110]";
export const INPUT =
  "w-full rounded-xl border-2 border-[#111110] bg-white px-4 py-3 text-base text-[#111110] placeholder:text-[#8F8A80] transition-shadow focus:outline-none focus:ring-4 focus:ring-[#0B6B45]/25";
export const LABEL = "mb-1.5 block text-sm font-bold";
export const LINK = "font-bold text-[#0B6B45] underline decoration-2 underline-offset-2 hover:text-[#111110]";

/* ── In-app recipes ────────────────────────────────────────────────
   The calmer, work-screen version of F2 used inside the signed-in app
   (piloted on the Signal Board). Smaller shadows, normal-size type. */

/** Brand colors, for places that need a raw value (charts, inline styles). */
export const F2 = {
  paper: "#F2EDE3",
  card: "#FFFDF8",
  ink: "#111110",
  green: "#0B6B45",
  mint: "#C7F2D9",
  yellow: "#FFE14D",
  lilac: "#BBA8FF",
  /** Plum: lilac deepened for text/lines on light backgrounds (7.4:1 on card). */
  violet: "#742A9E",
  /** Secondary text: 6.8:1 on card, 6.1:1 on paper. */
  muted: "#5E5A52",
  rule: "#E4DDD0",
} as const;

/** Main content panel: ink outline, modest offset shadow. */
export const PANEL = "rounded-2xl border-2 border-[#111110] bg-[#FFFDF8] shadow-[5px_5px_0_#111110]";
/** Small label above/below data, mono caps. */
export const EYEBROW = "font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.08em] text-[#5E5A52]";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B45]";
/** Compact primary button for toolbars and card footers. */
export const BTN_GO_SM = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#111110] bg-[#0B6B45] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#111110] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#111110] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_#111110]",
  FOCUS
);
/** Compact secondary button: outlined, paper fill. */
export const BTN_LINE_SM = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#111110] bg-[#FFFDF8] px-4 text-sm font-bold text-[#111110] transition-colors hover:bg-[#F2EDE3] disabled:cursor-not-allowed disabled:opacity-50",
  FOCUS
);
/** Quiet text button for tertiary actions. */
export const BTN_GHOST_SM = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-sm font-semibold text-[#111110] transition-colors hover:bg-[#F2EDE3] disabled:cursor-not-allowed disabled:opacity-50",
  FOCUS
);

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(D, "text-[26px] leading-none text-[#111110]", className)}>
      Culture<span className="text-[#0B6B45]">Pulse</span>
    </span>
  );
}

export function WordmarkLink({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="CulturePulse home" className={className}>
      <Wordmark />
    </Link>
  );
}
