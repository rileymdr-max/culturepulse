export interface MatchedSubculture {
  name: string;
  slug: string;
  category: string;
  match_pct: number;
  match_strength: "strong" | "moderate" | "emerging";
  why: string;
  key_signals: string[];
}

export interface DiscoveredSubculture {
  name: string;
  provisional_slug: string;
  description: string;
  estimated_audience_pct: number;
  key_signals: string[];
  why_new: string;
  suggested_category: string;
}

export interface BrandAuditResult {
  brand_handle: string;
  platform: string;
  audience_size: number;
  audience_summary: string;
  matched_subcultures: MatchedSubculture[];
  discovered_subcultures: DiscoveredSubculture[];
  primary_platforms: string[];
  dominant_themes: string[];
  analyzed_at: string;
  live: boolean;
  fallback?: boolean;
}
