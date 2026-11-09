"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Sparkles, Loader2, Plus, CheckCircle2, ChevronRight,
  BookOpen, Zap, AlertCircle, Clock, Hash, Users, Layers,
} from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SubcultureProfile } from "@/lib/types/subculture";

const RECENT_KEY = "speedbag:recent-discoveries";
const SESSION_KEY = "culturepulse-search";
const MAX_RECENT = 6;

const SUGGESTIONS = [
  "Sourdough bakers who document their process online",
  "Van life minimalists focused on remote work",
  "Quiet luxury fashion enthusiasts",
  "Competitive trail runners and ultramarathoners",
  "DIY electronics and mechanical keyboard hobbyists",
  "Thrift flipping resellers on TikTok",
  "Plant-based athletes who track their macros",
  "Independent coffee shop culture and third-wave coffee",
];

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function saveRecent(prompt: string) {
  try {
    const existing = loadRecent().filter((q) => q !== prompt);
    localStorage.setItem(RECENT_KEY, JSON.stringify([prompt, ...existing].slice(0, MAX_RECENT)));
  } catch {}
}

// ─── Profile result card ──────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function ProfileCard({ profile, seed }: { profile: SubcultureProfile; seed: string }) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  async function handleAddToLibrary() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/subcultures/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, seed, save: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setSavedSlug(json.subculture?.slug ?? profile.slug);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const primaryPlatforms = profile.platforms
    .filter((p) => p.engagement_level === "primary")
    .map((p) => p.platform);

  return (
    <Card className="border-indigo-500/20 bg-card">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {profile.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                <Sparkles className="h-2.5 w-2.5" />
                AI Discovery
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>
          </div>

          {/* Save CTA */}
          <div className="flex-shrink-0">
            {saveState === "saved" && savedSlug ? (
              <Link href={`/dashboard/subcultures/${savedSlug}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-green-600 dark:text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  View Profile
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={handleAddToLibrary}
                disabled={saveState === "saving"}
                className="gap-1.5"
              >
                {saveState === "saving" ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                ) : saveState === "error" ? (
                  <><AlertCircle className="h-3.5 w-3.5" />Failed — retry</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" />Add to Library</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Keywords</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.keywords.slice(0, 10).map((k) => (
              <span key={k} className="px-2 py-0.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15 text-[11px] font-medium">
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Vernacular */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vernacular</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.vernacular.slice(0, 8).map((v) => (
              <span key={v} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Two-col: Psychographics + Platforms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Identity</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Hero:</span> {profile.psychographics.hero}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Villain:</span> {profile.psychographics.villain}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {profile.psychographics.core_values.slice(0, 4).map((v) => (
                <span key={v} className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] text-muted-foreground">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platforms</span>
            </div>
            {profile.platforms.slice(0, 4).map((p) => (
              <div key={p.platform} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground capitalize">{p.platform}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  p.engagement_level === "primary"
                    ? "bg-indigo-500/10 text-indigo-500"
                    : p.engagement_level === "secondary"
                    ? "bg-muted text-muted-foreground"
                    : "text-muted-foreground/50"
                )}>
                  {p.engagement_level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Adjacent subcultures */}
        {profile.adjacent_subcultures.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adjacent to:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile.adjacent_subcultures.slice(0, 5).map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-full border border-border text-[11px] text-muted-foreground">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brand fit signals */}
        {profile.brand_fit_signals.fit_industries.length > 0 && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400 mb-1.5">Brand fit industries</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.brand_fit_signals.fit_industries.map((i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-[11px] font-medium">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        {saveState === "saved" && savedSlug && (
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <Link
              href={`/dashboard/subcultures/${savedSlug}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Full profile <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              href={`/dashboard/monitors`}
              className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Start monitoring <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverPageInner />
    </Suspense>
  );
}

type DiscoverState = "idle" | "loading" | "result" | "error";

function DiscoverPageInner() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<DiscoverState>("idle");
  const [result, setResult] = useState<{ profile: SubcultureProfile; seed: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  // Restore last result from sessionStorage on mount
  useEffect(() => {
    setRecent(loadRecent());
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.profile) {
          setResult(parsed);
          setState("result");
        }
      }
    } catch {}
  }, []);

  async function handleDiscover(inputPrompt?: string) {
    const q = (inputPrompt ?? prompt).trim();
    if (!q) return;

    setState("loading");
    setResult(null);
    setErrorMsg("");
    saveRecent(q);
    setRecent(loadRecent());

    try {
      const res = await fetch("/api/subcultures/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: q, seed: q, save: false }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const json = await res.json();
      const data = { profile: json.profile as SubcultureProfile, seed: q };
      setResult(data);
      setState("result");
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  const isLoading = state === "loading";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-8 pb-24 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Discover Subcultures</h1>
          <p className="text-sm text-muted-foreground">
            Describe any audience, interest, or niche — Claude builds a full intelligence profile you can add to your library.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDiscover();
              }}
              placeholder={'Describe an audience or subculture… e.g. “sourdough bakers who document their process online”'}
              rows={3}
              disabled={isLoading}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/40 hidden sm:block">⌘↩ to run</span>
              <Button
                size="sm"
                onClick={() => handleDiscover()}
                disabled={isLoading || !prompt.trim()}
                className="gap-1.5 h-7 px-3 text-xs"
              >
                {isLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Discovering…</>
                ) : (
                  <><Sparkles className="h-3 w-3" />Discover</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Building intelligence profile…</p>
              <p className="text-xs text-muted-foreground">Claude is mapping keywords, vernacular, icons, and signals. This takes about 30–60 seconds.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg || "Discovery failed. Try a different description."}
          </div>
        )}

        {/* Result */}
        {state === "result" && result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Profile generated for: <span className="text-foreground font-medium">"{result.seed}"</span>
              </p>
              <button
                onClick={() => { setState("idle"); setResult(null); setPrompt(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <ProfileCard profile={result.profile} seed={result.seed} />
          </div>
        )}

        {/* Pre-search state */}
        {state === "idle" && (
          <div className="space-y-6">

            {/* Recent discoveries */}
            {recent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Recent discoveries</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setPrompt(q); handleDiscover(q); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-150 text-left max-w-xs truncate"
                    >
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span className="truncate">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Try these</p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setPrompt(q); handleDiscover(q); }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 group"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500/50 group-hover:text-indigo-500 transition-colors" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Library shortcut */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
              <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Browse the library</p>
                <p className="text-xs text-muted-foreground">Explore subcultures already in your account</p>
              </div>
              <Link href="/dashboard/subcultures">
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  Open Library <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
