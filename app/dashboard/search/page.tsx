"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import {
  Sparkles, Loader2, Plus, CheckCircle2, ChevronRight,
  BookOpen, Zap, AlertCircle, Clock, Hash, Users, Layers,
  TrendingUp, MessageSquare, Eye, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SubcultureProfile, SubcultureSignalData } from "@/lib/types/subculture";

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

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: "reddit" | "tiktok" | "twitter" | "youtube" | "instagram" | "trends" | "ai" }) {
  const configs = {
    reddit:    { label: "Reddit",         cls: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    tiktok:    { label: "TikTok",         cls: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    twitter:   { label: "Twitter / X",    cls: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
    youtube:   { label: "YouTube",        cls: "text-red-500 bg-red-500/10 border-red-500/20" },
    instagram: { label: "Instagram",      cls: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    trends:    { label: "Google Trends",  cls: "text-green-500 bg-green-500/10 border-green-500/20" },
    ai:        { label: "AI Analysis",    cls: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  };
  const { label, cls } = configs[source];
  return (
    <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Live signal panel ────────────────────────────────────────────────────────

function SignalPanel({ signals }: { signals: SubcultureSignalData }) {
  const hasAny = signals.reddit || signals.tiktok || signals.twitter || signals.youtube || signals.instagram || signals.trends;
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live Signal Data
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/60">
          Scraped {new Date(signals.enriched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {signals.reddit && (
          <div className="rounded-md bg-background border border-orange-500/15 p-2.5 space-y-1">
            <SourceBadge source="reddit" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.reddit.total_posts_found}
            </p>
            <p className="text-[10px] text-muted-foreground">
              posts · {signals.reddit.communities.length} communities
            </p>
            <div className="space-y-0.5 pt-0.5">
              {signals.reddit.communities.slice(0, 3).map((c) => (
                <p key={c.subreddit} className="text-[10px] text-muted-foreground">
                  r/{c.subreddit}
                  {c.subscriber_count
                    ? ` · ${(c.subscriber_count / 1_000).toFixed(0)}K members`
                    : ""}
                </p>
              ))}
            </div>
          </div>
        )}
        {signals.tiktok && (
          <div className="rounded-md bg-background border border-pink-500/15 p-2.5 space-y-1">
            <SourceBadge source="tiktok" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.tiktok.videos_found}
            </p>
            <p className="text-[10px] text-muted-foreground">
              videos · {signals.tiktok.total_views >= 1_000_000
                ? `${(signals.tiktok.total_views / 1_000_000).toFixed(1)}M`
                : `${(signals.tiktok.total_views / 1_000).toFixed(0)}K`} views
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {signals.tiktok.top_hashtags.slice(0, 3).join("  ")}
            </p>
          </div>
        )}
        {signals.twitter && (
          <div className="rounded-md bg-background border border-sky-500/15 p-2.5 space-y-1">
            <SourceBadge source="twitter" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.twitter.tweets_found}
            </p>
            <p className="text-[10px] text-muted-foreground">
              tweets · {signals.twitter.total_engagement.toLocaleString()} engagement
            </p>
          </div>
        )}
        {signals.youtube && (
          <div className="rounded-md bg-background border border-red-500/15 p-2.5 space-y-1">
            <SourceBadge source="youtube" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.youtube.videos_found}
            </p>
            <p className="text-[10px] text-muted-foreground">
              videos · {signals.youtube.total_views >= 1_000_000
                ? `${(signals.youtube.total_views / 1_000_000).toFixed(1)}M`
                : `${(signals.youtube.total_views / 1_000).toFixed(0)}K`} views
            </p>
            {signals.youtube.top_videos[0] && (
              <p className="text-[10px] text-muted-foreground truncate">
                {signals.youtube.top_videos[0].channel}
              </p>
            )}
          </div>
        )}
        {signals.instagram && (
          <div className="rounded-md bg-background border border-purple-500/15 p-2.5 space-y-1">
            <SourceBadge source="instagram" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.instagram.posts_found}
            </p>
            <p className="text-[10px] text-muted-foreground">
              posts · {signals.instagram.total_likes.toLocaleString()} likes
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {signals.instagram.top_hashtags.slice(0, 3).join("  ")}
            </p>
          </div>
        )}
        {signals.trends && (
          <div className="rounded-md bg-background border border-green-500/15 p-2.5 space-y-1">
            <SourceBadge source="trends" />
            <p className="text-base font-bold text-foreground leading-none mt-1.5">
              {signals.trends.interest_score}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              interest score ·{" "}
              {signals.trends.trend === "rising" ? "↑ rising" :
               signals.trends.trend === "declining" ? "↓ declining" : "→ stable"}
            </p>
            {signals.trends.related_queries.length > 0 && (
              <p className="text-[10px] text-muted-foreground truncate">
                {signals.trends.related_queries.slice(0, 2).join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top Reddit posts */}
      {signals.reddit && signals.reddit.top_posts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-orange-500/80 uppercase tracking-wider">Top Reddit posts</p>
          {signals.reddit.top_posts.slice(0, 3).map((post, i) => (
            <a key={i} href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
              <span className="text-[10px] text-muted-foreground/40 mt-0.5 w-3 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground group-hover:text-orange-500 transition-colors truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-muted-foreground">r/{post.subreddit}</span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <TrendingUp className="h-2 w-2" />{post.score}
                  </span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <MessageSquare className="h-2 w-2" />{post.comments}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-orange-500/50 shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Top TikTok videos */}
      {signals.tiktok && signals.tiktok.top_videos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-pink-500/80 uppercase tracking-wider">Top TikTok videos</p>
          {signals.tiktok.top_videos.slice(0, 3).map((video, i) => (
            <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
              <span className="text-[10px] text-muted-foreground/40 mt-0.5 w-3 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground group-hover:text-pink-500 transition-colors truncate">
                  {video.caption || "(no caption)"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-muted-foreground">@{video.creator}</span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Eye className="h-2 w-2" />
                    {video.views >= 1_000_000
                      ? `${(video.views / 1_000_000).toFixed(1)}M`
                      : `${(video.views / 1_000).toFixed(0)}K`}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-pink-500/50 shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Top YouTube videos */}
      {signals.youtube && signals.youtube.top_videos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-red-500/80 uppercase tracking-wider">Top YouTube videos</p>
          {signals.youtube.top_videos.slice(0, 3).map((video, i) => (
            <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
              <span className="text-[10px] text-muted-foreground/40 mt-0.5 w-3 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground group-hover:text-red-500 transition-colors truncate">{video.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{video.channel}</span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Eye className="h-2 w-2" />
                    {video.views >= 1_000_000
                      ? `${(video.views / 1_000_000).toFixed(1)}M`
                      : `${(video.views / 1_000).toFixed(0)}K`}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-red-500/50 shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Google Trends related queries */}
      {signals.trends && signals.trends.related_queries.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-green-500/80 uppercase tracking-wider">Google Trends · Related searches</p>
          <div className="flex flex-wrap gap-1">
            {signals.trends.related_queries.slice(0, 10).map((q, i) => (
              <span key={i} className="text-[10px] bg-green-500/8 border border-green-500/15 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile result card ──────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function ProfileCard({
  profile,
  signalData,
  seed,
}: {
  profile: SubcultureProfile;
  signalData?: SubcultureSignalData;
  seed: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  async function handleAddToLibrary() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/subcultures/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass pre-built data to skip re-generation (saves ~90s)
        body: JSON.stringify({ name: profile.name, seed, save: true, profile, signal_data: signalData }),
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

  const platformsFound = [
    signalData?.reddit    && "Reddit",
    signalData?.tiktok    && "TikTok",
    signalData?.twitter   && "Twitter/X",
    signalData?.youtube   && "YouTube",
    signalData?.instagram && "Instagram",
    signalData?.trends    && "Google Trends",
  ].filter(Boolean);

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
              {platformsFound.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Live data · {platformsFound.join(", ")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI Analysis
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>
          </div>

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

        {/* Live signal panel */}
        {signalData && <SignalPanel signals={signalData} />}

        {/* Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Keywords</span>
            <SourceBadge source="ai" />
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
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vernacular</span>
            <SourceBadge source="ai" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.vernacular.slice(0, 8).map((v) => (
              <span key={v} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Identity + Platforms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Identity</span>
              <SourceBadge source="ai" />
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
            <div className="flex items-center gap-2">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platforms</span>
              <SourceBadge source="ai" />
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

        {/* Brand fit */}
        {profile.brand_fit_signals.fit_industries.length > 0 && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Brand fit industries</p>
              <SourceBadge source="ai" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.brand_fit_signals.fit_industries.map((i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-[11px] font-medium">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
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

type DiscoverResult = {
  profile: SubcultureProfile;
  signal_data?: SubcultureSignalData;
  seed: string;
};

function DiscoverPageInner() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<DiscoverState>("idle");
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const ranFromQuery = useRef(false); // guards StrictMode's double effect run

  // ?q= (from the welcome screen or a recent-search chip) runs a search;
  // otherwise restore the last result from sessionStorage.
  useEffect(() => {
    setRecent(loadRecent());
    const q = searchParams.get("q")?.trim();
    if (q) {
      if (ranFromQuery.current) return;
      ranFromQuery.current = true;
      setPrompt(q);
      handleDiscover(q);
      router.replace("/dashboard/search"); // so Back/refresh doesn't re-run it
      return;
    }
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.profile) { setResult(parsed); setState("result"); }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const data: DiscoverResult = {
        profile: json.profile as SubcultureProfile,
        signal_data: (json.profile as SubcultureProfile)?.signal_data,
        seed: q,
      };
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

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Discover Subcultures</h1>
          <p className="text-sm text-muted-foreground">
            Describe any audience or niche — we scrape Reddit, TikTok, Twitter, YouTube, and Google Trends in real time, then build a full intelligence profile grounded in live data.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDiscover(); }}
              placeholder={'Describe an audience or subculture… e.g. "sourdough bakers who document their process online"'}
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
                {isLoading
                  ? <><Loader2 className="h-3 w-3 animate-spin" />Discovering…</>
                  : <><Sparkles className="h-3 w-3" />Discover</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <TrendingUp className="absolute inset-0 m-auto h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">Scraping live signals…</p>
              <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Reddit
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                  TikTok
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: "0.6s" }} />
                  Twitter / X
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Then analysing with Claude · 60–90 seconds</p>
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
                Profile for: <span className="text-foreground font-medium">"{result.seed}"</span>
              </p>
              <button
                onClick={() => { setState("idle"); setResult(null); setPrompt(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <ProfileCard profile={result.profile} signalData={result.signal_data} seed={result.seed} />
          </div>
        )}

        {/* Idle state */}
        {state === "idle" && (
          <div className="space-y-6">
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
                      <TrendingUp className="h-3 w-3 shrink-0" />
                      <span className="truncate">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Try these</p>
              <div className="space-y-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setPrompt(q); handleDiscover(q); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 group"
                  >
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-indigo-500/50 group-hover:text-indigo-500 transition-colors" />
                    {q}
                  </button>
                ))}
              </div>
            </div>

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
