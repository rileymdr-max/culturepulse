"use client";

import { ArrowLeft, Sparkles, Hash, MessageSquare, Package, Calendar, Radio, Users, Brain, Layers, TrendingUp, AlertTriangle, Bell, CheckCircle, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubculture } from "@/hooks/use-subcultures";
import { useMonitors, useCreateMonitor } from "@/hooks/use-monitors";
import { useCreateBrief, useBriefs } from "@/hooks/use-briefs";

const SENTIMENT_STYLES: Record<string, string> = {
  revered: "bg-green-500/10 text-green-400 border-green-500/20",
  respected: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  controversial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  villainized: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ENGAGEMENT_STYLES: Record<string, string> = {
  primary: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  secondary: "bg-muted text-muted-foreground border-border",
  minimal: "bg-muted/50 text-muted-foreground/60 border-border/50",
};

function Section({ icon: Icon, title, children, className }: { icon: React.ElementType; title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TagList({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className={cn("px-2 py-0.5 rounded-full text-xs border bg-muted/50 text-foreground border-border", className)}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function SubcultureDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useSubculture(slug);
  const s = data?.subculture;

  const { data: monitorsData } = useMonitors(s?.id);
  const existingMonitor = monitorsData?.monitors?.[0];
  const { mutate: startMonitor, isPending: isStartingMonitor } = useCreateMonitor();
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();
  const { data: briefsData } = useBriefs(s?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !s) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
          <p className="text-muted-foreground">Subculture not found.</p>
          <Link href="/dashboard/subcultures"><Button variant="ghost" size="sm" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Back to Library</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Link href="/dashboard/subcultures">
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Library
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{s.name}</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">{s.category}</span>
              <span className={cn("text-xs px-2 py-1 rounded-full border", s.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                {s.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{s.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Monitor CTA */}
            {existingMonitor ? (
              <Link href="/dashboard/monitors">
                <Button variant="outline" className="gap-2 border-green-500/40 text-green-400 hover:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  Monitoring Active
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                disabled={isStartingMonitor || !s}
                onClick={() => s && startMonitor({ subcultureId: s.id })}
              >
                {isStartingMonitor ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
                ) : (
                  <><Bell className="h-4 w-4" /> Start Monitoring</>
                )}
              </Button>
            )}

            {/* Generate Brief CTA */}
            {briefResult?.brief ? (
              <Link href={`/dashboard/briefs/${briefResult.brief.id}`}>
                <Button className="gap-2 border-indigo-500/40 text-indigo-500 hover:text-indigo-400" variant="outline">
                  <FileText className="h-4 w-4" />View Brief
                </Button>
              </Link>
            ) : (briefsData?.briefs?.length ?? 0) > 0 ? (
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/briefs/${briefsData!.briefs[0].id}`}>
                  <Button variant="outline" className="gap-2 text-sm">
                    <FileText className="h-4 w-4" />Latest Brief
                  </Button>
                </Link>
                <Button
                  className="gap-2"
                  disabled={isGeneratingBrief || !s}
                  onClick={() => s && createBrief({
                    subcultureId: s.id,
                    monitorId: existingMonitor?.id,
                  })}
                >
                  {isGeneratingBrief
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                    : <><FileText className="h-4 w-4" />New Brief</>
                  }
                </Button>
              </div>
            ) : (
              <Button
                className="gap-2"
                disabled={isGeneratingBrief || !s}
                onClick={() => s && createBrief({
                  subcultureId: s.id,
                  monitorId: existingMonitor?.id,
                })}
              >
                {isGeneratingBrief
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                  : <><FileText className="h-4 w-4" />Generate Brief</>
                }
              </Button>
            )}
          </div>
        </div>

        {/* Top 3 fields — full width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Section icon={Hash} title="Keywords">
            <TagList items={s.keywords} />
          </Section>
          <Section icon={MessageSquare} title="Vernacular">
            <TagList items={s.vernacular} className="font-mono" />
          </Section>
          <Section icon={Package} title="Categorical Behaviors">
            <TagList items={s.categoricalBehaviors} />
          </Section>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Moments */}
          <Section icon={Calendar} title="Moments & Triggers">
            <ul className="space-y-3">
              {s.moments.map(m => (
                <li key={m.name} className="border-l-2 border-indigo-500/30 pl-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.timing}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.description}</p>
                </li>
              ))}
            </ul>
          </Section>

          {/* Icons */}
          <Section icon={Users} title="Icons & Entities">
            <ul className="space-y-2">
              {s.icons.map(icon => (
                <li key={icon.name} className="flex items-start gap-2">
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5", SENTIMENT_STYLES[icon.sentiment] ?? "bg-muted text-muted-foreground border-border")}>
                    {icon.sentiment}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-foreground">{icon.name}</span>
                    <p className="text-xs text-muted-foreground">{icon.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Platforms */}
          <Section icon={Radio} title="Platforms">
            <ul className="space-y-2">
              {s.platforms.map(p => (
                <li key={p.platform}>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border", ENGAGEMENT_STYLES[p.engagement_level] ?? "bg-muted")}>
                      {p.engagement_level}
                    </span>
                    <span className="text-sm font-medium text-foreground">{p.platform}</span>
                  </div>
                  {p.content_formats.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-0 pl-0">
                      {p.content_formats.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {/* Psychographics */}
          <Section icon={Brain} title="Psychographics">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-green-400 mb-1">Hero archetype</p>
                <p className="text-sm text-foreground">{s.psychographics.hero}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-red-400 mb-1">Villain archetype</p>
                <p className="text-sm text-foreground">{s.psychographics.villain}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Core values</p>
                <TagList items={s.psychographics.core_values} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Motivations</p>
                <TagList items={s.psychographics.motivations} />
              </div>
            </div>
          </Section>

          {/* Adjacent + Brand Fit */}
          <div className="space-y-4">
            <Section icon={Layers} title="Adjacent Subcultures">
              <TagList items={s.adjacentSubcultures} />
            </Section>
            <Section icon={TrendingUp} title="Brand Fit">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-green-400 mb-1.5">Fits with</p>
                  <TagList items={s.brandFitSignals.fit_industries} />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Red flags
                  </p>
                  <ul className="space-y-1">
                    {s.brandFitSignals.red_flags.map(flag => (
                      <li key={flag} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-red-400/60 mt-0.5">—</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* Media sources */}
        <Section icon={Radio} title="Media Sources">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {s.mediaSources.map(m => (
              <div key={m.name} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{m.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 text-right">{m.type}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
