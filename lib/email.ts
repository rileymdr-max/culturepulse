import { Resend } from "resend";
import { env } from "@/lib/env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

const FROM = env.RESEND_FROM ?? "CulturePulse <alerts@culturepulse.app>";
const SITE_URL = (process.env.NEXTAUTH_URL || "https://www.culture-pulse.com").replace(/\/$/, "");
const SIGNAL_BOARD_URL = `${SITE_URL}/dashboard/monitors`;

// ─── F2 email kit ─────────────────────────────────────────────────────────────
// Same brand as the site (components/marketing/brand.tsx), built for email:
// tables + inline styles only. Anton/DM Sans load in Apple Mail and iOS; other
// clients fall back to Impact / Helvetica, so the poster look still holds.

const C = {
  paper: "#F2EDE3",
  card: "#FFFDF8",
  ink: "#111110",
  green: "#0B6B45",
  mint: "#C7F2D9",
  yellow: "#FFE14D",
  lilac: "#BBA8FF",
  plum: "#742A9E",
  muted: "#5E5A52",
  rule: "#E4DDD0",
  red: "#B42318",
} as const;

const F_DISPLAY = "Anton,Impact,'Arial Narrow Bold','Helvetica Neue',Arial,sans-serif";
const F_BODY = "'DM Sans',Helvetica,Arial,sans-serif";
const F_MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit", twitter: "X", tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram", trends: "Google Trends",
};
const platformLabel = (p: string) => PLATFORM_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

/** Score tiers, same thresholds and colors as the Signal Board. */
function tierFor(score: number): { label: string; chipBg: string; chipText: string; scoreColor: string } | null {
  if (score >= 70) return { label: "Breakout", chipBg: C.green, chipText: "#FFFFFF", scoreColor: C.green };
  if (score >= 55) return { label: "Trending", chipBg: C.lilac, chipText: C.ink, scoreColor: C.plum };
  if (score >= 35) return { label: "Rising", chipBg: C.mint, chipText: C.ink, scoreColor: C.ink };
  return null;
}

function chip(label: string, bg: string, color: string): string {
  return `<span style="display:inline-block;background:${bg};color:${color};border:2px solid ${C.ink};border-radius:999px;padding:3px 10px;font-family:${F_BODY};font-size:12px;font-weight:700;line-height:1.2;white-space:nowrap;">${escHtml(label)}</span>`;
}

function eyebrow(text: string): string {
  return `<p style="margin:0 0 8px;font-family:${F_MONO};font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">${escHtml(text)}</p>`;
}

function button(label: string, href: string): string {
  return `<a href="${escHtml(href)}" style="display:inline-block;background:${C.green};color:#FFFFFF;border:2px solid ${C.ink};border-radius:999px;box-shadow:3px 3px 0 ${C.ink};padding:12px 24px;font-family:${F_BODY};font-size:15px;font-weight:700;text-decoration:none;">${escHtml(label)} &rarr;</a>`;
}

function textLink(label: string, href: string): string {
  return `<a href="${escHtml(href)}" style="color:${C.green};font-weight:700;text-decoration:underline;">${escHtml(label)}</a>`;
}

/** Page shell: paper background, wordmark, ink-outlined card, small footer. */
function layout(o: { preheader: string; sticker: string; title: string; body: string; footer: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.paper};color:${C.ink};font-family:${F_BODY};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escHtml(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
    <tr><td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 18px;">
          <a href="${SITE_URL}" style="text-decoration:none;font-family:${F_DISPLAY};font-size:26px;line-height:1;letter-spacing:.01em;text-transform:uppercase;color:${C.ink};">Culture<span style="color:${C.green};">Pulse</span></a>
        </td></tr>
        <tr><td style="background:${C.card};border:2px solid ${C.ink};border-radius:18px;box-shadow:6px 6px 0 ${C.ink};padding:24px 24px 28px;">
          <div style="margin:0 0 14px;">${o.sticker}</div>
          <h1 style="margin:0 0 18px;font-family:${F_DISPLAY};font-size:38px;font-weight:400;line-height:1.02;text-transform:uppercase;color:${C.ink};">${escHtml(o.title)}</h1>
          ${o.body}
        </td></tr>
        <tr><td style="padding:20px 4px 0;font-family:${F_BODY};font-size:12px;line-height:1.6;color:${C.muted};">
          ${o.footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Breakout Alert ───────────────────────────────────────────────────────────

export interface BreakoutAlertPayload {
  toEmail: string;
  toName: string;
  subcultureName: string;
  breakoutScore: number;
  platforms: string[];
  topPost?: { title: string; url: string; score: number };
}

function breakoutAlertHtml(p: BreakoutAlertPayload): string {
  const platformList = p.platforms.map(platformLabel).join(", ");
  const postUrl = p.topPost ? safeUrl(p.topPost.url) : null;

  const scoreBlock = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${C.rule};border-radius:14px;">
    <tr><td style="padding:16px 18px 14px;border-bottom:2px solid ${C.rule};">
      <span style="font-family:${F_DISPLAY};font-size:56px;line-height:.95;color:${C.green};">${p.breakoutScore}</span>
      <span style="padding-left:10px;font-family:${F_MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">Breakout Score</span>
    </td></tr>
    <tr><td style="padding:14px 18px 16px;font-family:${F_BODY};">
      <p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${C.ink};"><strong>${escHtml(p.subcultureName)}</strong> just crossed into breakout territory.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${C.muted};">Watching ${escHtml(platformList)}. Alerts fire at a score of 70 or more.</p>
    </td></tr>
  </table>`;

  const topPostBlock = p.topPost && postUrl
    ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:${C.paper};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      ${eyebrow("Top signal")}
      <p style="margin:0 0 10px;font-family:${F_BODY};font-size:15px;line-height:1.5;color:${C.ink};">${escHtml(p.topPost.title)}</p>
      <p style="margin:0;font-family:${F_BODY};font-size:14px;">${textLink("View post", postUrl)}</p>
    </td></tr>
  </table>`
    : "";

  return layout({
    preheader: `${p.subcultureName} hit a Breakout Score of ${p.breakoutScore}.`,
    sticker: chip("Breakout alert", C.green, "#FFFFFF"),
    title: p.subcultureName,
    body: `${scoreBlock}${topPostBlock}<div style="margin-top:24px;">${button("Open Signal Board", SIGNAL_BOARD_URL)}</div>`,
    footer: `You're getting this because you monitor ${escHtml(p.subcultureName)} on CulturePulse. ${textLink("Manage alerts", SIGNAL_BOARD_URL)}`,
  });
}

export async function sendBreakoutAlert(payload: BreakoutAlertPayload): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: payload.toEmail,
    subject: `Breakout: ${payload.subcultureName} hit ${payload.breakoutScore}`,
    html: breakoutAlertHtml(payload),
  });
}

// ─── Weekly Digest ────────────────────────────────────────────────────────────

export interface DigestMonitor {
  subcultureName: string;
  platforms: string[];
  breakoutScore: number;
  trend: "rising" | "stable" | "falling";
  topPost?: { title: string; url: string };
}

export interface WeeklyDigestPayload {
  toEmail: string;
  toName: string;
  weekOf: string; // e.g. "Nov 4 – 10, 2026"
  monitors: DigestMonitor[];
}

function trendText(t: DigestMonitor["trend"]): string {
  const [arrow, label, color] =
    t === "rising" ? ["&uarr;", "Rising", C.green] : t === "falling" ? ["&darr;", "Falling", C.red] : ["&rarr;", "Steady", C.muted];
  return `<span style="color:${color};font-weight:700;">${arrow} ${label}</span>`;
}

function digestMonitorRow(m: DigestMonitor): string {
  const tier = tierFor(m.breakoutScore);
  const postUrl = m.topPost ? safeUrl(m.topPost.url) : null;
  const title = m.topPost ? (m.topPost.title.length > 80 ? `${m.topPost.title.slice(0, 80)}…` : m.topPost.title) : "";
  return `<tr>
    <td style="padding:14px 0;border-bottom:2px solid ${C.rule};vertical-align:top;font-family:${F_BODY};">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;line-height:1.3;color:${C.ink};">${escHtml(m.subcultureName)}${tier ? `&nbsp; ${chip(tier.label, tier.chipBg, tier.chipText)}` : ""}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${C.muted};">${escHtml(m.platforms.map(platformLabel).join(", "))}</p>
      ${m.topPost && postUrl ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;"><a href="${escHtml(postUrl)}" style="color:${C.ink};text-decoration:underline;">${escHtml(title)}</a></p>` : ""}
    </td>
    <td width="96" style="padding:14px 0 14px 16px;border-bottom:2px solid ${C.rule};vertical-align:top;text-align:right;white-space:nowrap;">
      <p style="margin:0;font-family:${F_DISPLAY};font-size:34px;line-height:1;color:${tier?.scoreColor ?? C.muted};">${m.breakoutScore}</p>
      <p style="margin:4px 0 0;font-family:${F_BODY};font-size:12px;">${trendText(m.trend)}</p>
    </td>
  </tr>`;
}

function weeklyDigestHtml(p: WeeklyDigestPayload): string {
  const sorted = [...p.monitors].sort((a, b) => b.breakoutScore - a.breakoutScore);
  const rows = sorted.map(digestMonitorRow).join("");
  const breakouts = sorted.filter((m) => m.breakoutScore >= 70);

  const summary = breakouts.length > 0
    ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;background:${C.mint};border:2px solid ${C.ink};border-radius:14px;">
    <tr><td style="padding:14px 18px;font-family:${F_BODY};font-size:15px;line-height:1.5;color:${C.ink};">
      <strong>${breakouts.length} breakout${breakouts.length > 1 ? "s" : ""} this week:</strong> ${breakouts.map((m) => escHtml(m.subcultureName)).join(", ")}
    </td></tr>
  </table>`
    : `<p style="margin:0 0 22px;font-family:${F_BODY};font-size:15px;line-height:1.5;color:${C.muted};">No breakouts this week. Here's where your monitors stand.</p>`;

  return layout({
    preheader: breakouts.length > 0
      ? `${breakouts.length} breakout${breakouts.length > 1 ? "s" : ""} this week across ${sorted.length} monitors.`
      : `Your ${sorted.length} monitors, ranked by Breakout Score.`,
    sticker: chip("Weekly digest", C.yellow, C.ink),
    title: `Week of ${p.weekOf}`,
    body: `${summary}
  ${eyebrow("All monitors, ranked by Breakout Score")}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${C.ink};">
    ${rows}
  </table>
  <div style="margin-top:24px;">${button("Open Signal Board", SIGNAL_BOARD_URL)}</div>`,
    footer: `CulturePulse sends this every Monday. ${textLink("Manage preferences", SIGNAL_BOARD_URL)}`,
  });
}

export async function sendWeeklyDigest(payload: WeeklyDigestPayload): Promise<void> {
  if (payload.monitors.length === 0) return;
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: payload.toEmail,
    subject: `CulturePulse weekly digest — ${payload.weekOf}`,
    html: weeklyDigestHtml(payload),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Only http(s) links from scraped posts make it into an email. */
function safeUrl(u: string): string | null {
  return /^https?:\/\//i.test(u) ? u : null;
}

// ─── Sign-up approval ─────────────────────────────────────────────────────────

function simpleEmailHtml(heading: string, paragraphs: string[], cta: { label: string; href: string }, sticker: string): string {
  return layout({
    preheader: heading,
    sticker: chip(sticker, C.mint, C.ink),
    title: heading,
    body: `${paragraphs.map((p) => `<p style="margin:0 0 14px;font-family:${F_BODY};font-size:16px;line-height:1.55;color:${C.ink};">${p}</p>`).join("")}<div style="margin-top:22px;">${button(cta.label, cta.href)}</div>`,
    footer: `CulturePulse · ${textLink("culture-pulse.com", SITE_URL)}`,
  });
}

/** Tells the admin someone signed up and is waiting for approval. */
export async function sendSignupRequest(payload: { toEmail: string; name: string; email: string }): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: payload.toEmail,
    subject: `New CulturePulse sign-up: ${payload.name}`,
    html: simpleEmailHtml(
      "Someone wants in",
      [`<strong>${escHtml(payload.name)}</strong> (${escHtml(payload.email)}) created an account and is waiting for your approval.`],
      { label: "Review sign-ups", href: `${SITE_URL}/dashboard/admin?tab=signups` },
      "New sign-up"
    ),
  });
}

/** Tells a new user their account was approved. */
export async function sendAccountApproved(payload: { toEmail: string; toName: string | null }): Promise<void> {
  const first = payload.toName?.split(" ")[0];
  await getResend().emails.send({
    from: FROM,
    to: payload.toEmail,
    subject: "You're in: your CulturePulse account is ready",
    html: simpleEmailHtml(
      first ? `You're in, ${first}` : "You're in",
      ["Your CulturePulse account has been approved. Sign in to set up your first monitor and see which subcultures are about to break out."],
      { label: "Sign in", href: `${SITE_URL}/login` },
      "Account approved"
    ),
  });
}
