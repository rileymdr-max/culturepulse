"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Palette, Globe, CheckCircle, Loader2, AlertCircle, Eye } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspace, useUpdateBranding } from "@/hooks/use-workspace";

const PRESET_COLORS = [
  "#3b82f6", // blue (default)
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#6b7280", // gray
];

export default function BrandingPage() {
  return (
    <Suspense>
      <BrandingPageInner />
    </Suspense>
  );
}

function BrandingPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get("id") ?? "";

  const { data, isLoading, error } = useWorkspace(workspaceId);
  const { mutate: updateBranding, isPending: isSaving, isSuccess } = useUpdateBranding(workspaceId);

  const ws = data?.workspace;

  const [brandName,    setBrandName]    = useState("");
  const [brandColor,   setBrandColor]   = useState("#3b82f6");
  const [brandLogo,    setBrandLogo]    = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // Seed from loaded workspace
  useEffect(() => {
    if (!ws) return;
    setBrandName(ws.brandName ?? "");
    setBrandColor(ws.brandColor ?? "#3b82f6");
    setBrandLogo(ws.brandLogo ?? "");
    setCustomDomain(ws.customDomain ?? "");
  }, [ws]);

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
          <p className="text-muted-foreground">No workspace selected.</p>
          <Link href="/dashboard/workspace">
            <Button variant="ghost" size="sm" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !ws) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" /> Workspace not found.
          </div>
          <Link href="/dashboard/workspace">
            <Button variant="ghost" size="sm" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
        </main>
      </div>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateBranding({
      brandName:    brandName.trim() || null as unknown as string,
      brandLogo:    brandLogo.trim() || null,
      brandColor,
      customDomain: customDomain.trim() || null,
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link href="/dashboard/workspace">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> Workspaces
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-blue-400" />
            Branding — {ws.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize how this workspace appears to your team and clients.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings form */}
          <form onSubmit={handleSave} className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Brand name</label>
                  <Input
                    placeholder={ws.name}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown instead of the workspace slug. Defaults to workspace name.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Logo URL</label>
                  <Input
                    placeholder="https://cdn.yourbrand.com/logo.png"
                    value={brandLogo}
                    onChange={(e) => setBrandLogo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct URL to a PNG or SVG (40×40px recommended).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Brand color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandColor(c)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-all",
                          brandColor === c ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground"
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-7 w-7 rounded-full border-0 cursor-pointer bg-transparent"
                      title="Custom color"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for accent colors throughout the workspace UI.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />Custom Domain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="insights.yourbrand.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Setup instructions</p>
                  <p>1. Add a CNAME record: <code className="bg-muted px-1 rounded">your-domain → cname.vercel-dns.com</code></p>
                  <p>2. Add the domain in your Vercel project settings</p>
                  <p>3. Enter the domain above and save</p>
                  <p>Routing is handled automatically via Next.js middleware.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : isSuccess
                  ? <><CheckCircle className="h-4 w-4 text-green-400" />Saved!</>
                  : "Save branding"
                }
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>

          {/* Live preview */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />Preview
            </h2>
            <Card className="overflow-hidden">
              {/* Mini nav preview */}
              <div
                className="h-12 flex items-center px-4 gap-3 border-b border-border/50"
                style={{ background: `${brandColor}08` }}
              >
                {brandLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandLogo} alt="logo" className="h-6 w-6 rounded object-contain" />
                ) : (
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(brandName || ws.name).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-sm text-foreground">
                  {brandName || ws.name}
                </span>
                <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
                  <span>Search</span>
                  <span>Library</span>
                  <span style={{ color: brandColor }}>Signals</span>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div
                  className="h-2 w-24 rounded-full"
                  style={{ backgroundColor: `${brandColor}60` }}
                />
                <div className="h-1.5 w-40 rounded-full bg-muted" />
                <div className="h-1.5 w-32 rounded-full bg-muted" />
                <div
                  className="inline-block text-xs px-2.5 py-1 rounded-full text-white mt-1"
                  style={{ backgroundColor: brandColor }}
                >
                  BREAKOUT
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              The brand color is applied as a CSS accent throughout the workspace navigation and key UI elements.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
