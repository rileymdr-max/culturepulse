/**
 * Link-preview image (Open Graph + Twitter/X) shown when the site is shared on
 * LinkedIn, Slack, iMessage, X, etc. Rendered once at build time.
 */

import { ImageResponse } from "next/og";

export const alt = "CulturePulse: every trend starts as a subculture nobody's watching.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#111110";
const PAPER = "#F2EDE3";
const GREEN = "#0B6B45";
const YELLOW = "#FFE14D";
const CARD = "#FFFDF8";

/** Loads a Google Font as TTF, limited to the characters we draw. */
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const HEADLINE = ["EVERY TREND", "STARTS AS A", "SUBCULTURE", "NOBODY'S WATCHING."];
const SUB = "Spot breakout micro-communities early. Get the brief to show up first.";
const PILLS = [
  { label: "Quiet luxury", score: 84, bg: "#BBA8FF" },
  { label: "Dark academia", score: 61, bg: YELLOW },
  { label: "Van life", score: 47, bg: "#C7F2D9" },
];

export default async function OpengraphImage() {
  const displayText = HEADLINE.join("") + "CULTUREPULSE";
  const bodyText = SUB + PILLS.map((p) => p.label + p.score).join("") + "culture-pulse.com";
  const [anton, dmSans] = await Promise.all([
    loadGoogleFont("Anton", 400, displayText),
    loadGoogleFont("DM+Sans", 700, bodyText),
  ]);
  const fonts = [
    ...(anton ? [{ name: "Anton", data: anton, weight: 400 as const, style: "normal" as const }] : []),
    ...(dmSans ? [{ name: "DM Sans", data: dmSans, weight: 700 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: "48px 72px 44px",
          fontFamily: "DM Sans",
          borderBottom: `14px solid ${GREEN}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, letterSpacing: 1 }}>
            CULTURE<span style={{ color: GREEN }}>PULSE</span>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#5E5A52" }}>culture-pulse.com</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Anton", fontSize: 84, lineHeight: 1 }}>
            <div style={{ display: "flex" }}>{HEADLINE[0]}</div>
            <div style={{ display: "flex" }}>{HEADLINE[1]}</div>
            <div style={{ display: "flex", color: GREEN }}>{HEADLINE[2]}</div>
            <div style={{ display: "flex" }}>
              <span style={{ background: YELLOW, padding: "0 10px", marginLeft: -10 }}>NOBODY&apos;S</span>
              <span style={{ marginLeft: 20 }}>WATCHING.</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 18 }}>
            {PILLS.map((p) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: p.bg,
                  border: `3px solid ${INK}`,
                  borderRadius: 999,
                  padding: "10px 22px",
                  fontSize: 26,
                  boxShadow: `5px 5px 0 ${INK}`,
                }}
              >
                {p.label}
                <span style={{ background: CARD, borderRadius: 999, padding: "0 12px" }}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28 }}>{SUB}</div>
      </div>
    ),
    { ...size, fonts }
  );
}
