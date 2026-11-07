import { Resend } from "resend";
import { env } from "@/lib/env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

const FROM = env.RESEND_FROM ?? "CulturePulse <alerts@culturepulse.app>";

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
  const platformList = p.platforms.map((pl) => pl.charAt(0).toUpperCase() + pl.slice(1)).join(" + ");
  const topPostSection = p.topPost
    ? `<tr><td style="padding:16px 24px 0;">
        <div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:8px;padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#818cf8;">Top signal</p>
          <p style="margin:0 0 8px;font-size:14px;color:#e0e7ff;line-height:1.5;">${escHtml(p.topPost.title)}</p>
          <a href="${p.topPost.url}" style="font-size:12px;color:#818cf8;">View post →</a>
        </div>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0e17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e17;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#13111e;border:1px solid #2d2b3d;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#c7d2fe;">Breakout Alert</p>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">${escHtml(p.subcultureName)}</h1>
        </td></tr>
        <!-- Score badge -->
        <tr><td style="padding:24px 24px 0;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#4f46e5;border-radius:8px;padding:12px 20px;text-align:center;">
              <p style="margin:0;font-size:40px;font-weight:900;color:#ffffff;line-height:1;">${p.breakoutScore}</p>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#c7d2fe;">Breakout Score</p>
            </td>
            <td style="padding-left:16px;vertical-align:middle;">
              <p style="margin:0 0 4px;font-size:14px;color:#a5b4fc;">Monitoring: ${escHtml(platformList)}</p>
              <p style="margin:0;font-size:13px;color:#6b7280;">Score ≥70 triggers this alert</p>
            </td>
          </tr></table>
        </td></tr>
        ${topPostSection}
        <!-- CTA -->
        <tr><td style="padding:24px;">
          <a href="https://culturepulse-ashy.vercel.app/dashboard/monitors" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
            View Monitor →
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="border-top:1px solid #2d2b3d;padding:16px 24px;">
          <p style="margin:0;font-size:12px;color:#4b5563;">
            CulturePulse · <a href="https://culturepulse-ashy.vercel.app/dashboard/monitors" style="color:#6b7280;">Manage alerts</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBreakoutAlert(payload: BreakoutAlertPayload): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: payload.toEmail,
    subject: `🚀 Breakout signal: ${payload.subcultureName} (score ${payload.breakoutScore})`,
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

function trendArrow(t: DigestMonitor["trend"]): string {
  return t === "rising" ? "↑" : t === "falling" ? "↓" : "→";
}

function trendColor(t: DigestMonitor["trend"]): string {
  return t === "rising" ? "#34d399" : t === "falling" ? "#f87171" : "#9ca3af";
}

function digestMonitorRow(m: DigestMonitor): string {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #2d2b3d;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#e5e7eb;">${escHtml(m.subcultureName)}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${m.platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}</p>
          ${m.topPost ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;"><a href="${m.topPost.url}" style="color:#818cf8;text-decoration:none;">${escHtml(m.topPost.title.slice(0, 80))}…</a></p>` : ""}
        </div>
        <div style="text-align:right;padding-left:16px;white-space:nowrap;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">${m.breakoutScore}</p>
          <p style="margin:0;font-size:14px;color:${trendColor(m.trend)};">${trendArrow(m.trend)}</p>
        </div>
      </div>
    </td>
  </tr>`;
}

function weeklyDigestHtml(p: WeeklyDigestPayload): string {
  const sorted = [...p.monitors].sort((a, b) => b.breakoutScore - a.breakoutScore);
  const rows = sorted.map(digestMonitorRow).join("");
  const breakouts = sorted.filter((m) => m.breakoutScore >= 70);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0e17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e17;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#13111e;border:1px solid #2d2b3d;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#2e1065);padding:24px;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#a5b4fc;">Weekly Digest</p>
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#ffffff;">CulturePulse</h1>
          <p style="margin:0;font-size:13px;color:#818cf8;">${escHtml(p.weekOf)}</p>
        </td></tr>
        ${breakouts.length > 0 ? `
        <!-- Breakout summary -->
        <tr><td style="padding:16px 24px 0;">
          <div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:8px;padding:12px 16px;">
            <p style="margin:0;font-size:13px;color:#a5b4fc;">
              🚀 <strong style="color:#e0e7ff;">${breakouts.length} breakout${breakouts.length > 1 ? "s" : ""} this week:</strong>
              ${breakouts.map((m) => escHtml(m.subcultureName)).join(", ")}
            </p>
          </div>
        </td></tr>` : ""}
        <!-- Monitor table -->
        <tr><td style="padding:16px 24px 0;">
          <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">All Monitors — Ranked by Score</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2b3d;">
            ${rows}
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:24px;">
          <a href="https://culturepulse-ashy.vercel.app/dashboard/monitors" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Open Monitors →
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="border-top:1px solid #2d2b3d;padding:16px 24px;">
          <p style="margin:0;font-size:12px;color:#4b5563;">
            CulturePulse · Sent every Monday · <a href="https://culturepulse-ashy.vercel.app/dashboard/monitors" style="color:#6b7280;">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
