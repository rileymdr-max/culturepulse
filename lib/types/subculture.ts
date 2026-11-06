export interface SubcultureMoment {
  name: string;
  timing: string;
  description: string;
}

export interface SubcultureMediaSource {
  name: string;
  type: string;
  description: string;
}

export interface SubcultureIcon {
  name: string;
  role: string;
  sentiment: "revered" | "respected" | "controversial" | "villainized";
}

export interface SubculturePlatform {
  platform: string;
  engagement_level: "primary" | "secondary" | "minimal";
  content_formats: string[];
}

export interface SubculturePsychographics {
  hero: string;
  villain: string;
  core_values: string[];
  motivations: string[];
}

export interface SubcultureBrandFitSignals {
  fit_industries: string[];
  red_flags: string[];
}

// Matches the tool output schema (snake_case) before mapping to Prisma (camelCase)
export interface SubcultureProfile {
  name: string;
  slug: string;
  description: string;
  category: string;
  keywords: string[];
  vernacular: string[];
  categorical_behaviors: string[];
  moments: SubcultureMoment[];
  media_sources: SubcultureMediaSource[];
  icons: SubcultureIcon[];
  platforms: SubculturePlatform[];
  psychographics: SubculturePsychographics;
  adjacent_subcultures: string[];
  brand_fit_signals: SubcultureBrandFitSignals;
}
