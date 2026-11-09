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

// ─── Live signal data (real scraped, per platform) ────────────────────────────

export interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  score: number;
  comments: number;
}

export interface RedditCommunity {
  subreddit: string;
  posts_found: number;
  engagement: number;
  subscriber_count?: number;
}

export interface RedditSignal {
  communities: RedditCommunity[];
  top_posts: RedditPost[];
  total_posts_found: number;
  scraped_at: string;
}

export interface TikTokVideo {
  caption: string;
  url: string;
  views: number;
  likes: number;
  creator: string;
  creator_followers?: number;
}

export interface TikTokSignal {
  videos_found: number;
  top_videos: TikTokVideo[];
  top_hashtags: string[];
  total_views: number;
  scraped_at: string;
}

export interface TwitterPost {
  text: string;
  url: string;
  engagement: number;
  author?: string;
}

export interface TwitterSignal {
  tweets_found: number;
  top_tweets: TwitterPost[];
  total_engagement: number;
  scraped_at: string;
}

export interface YouTubeVideo {
  title: string;
  url: string;
  views: number;
  likes: number;
  channel: string;
  channel_subscribers?: number;
}

export interface YouTubeSignal {
  videos_found: number;
  top_videos: YouTubeVideo[];
  total_views: number;
  scraped_at: string;
}

export interface InstagramPost {
  caption?: string;
  url: string;
  likes: number;
  comments: number;
  owner?: string;
}

export interface InstagramSignal {
  posts_found: number;
  top_posts: InstagramPost[];
  top_hashtags: string[];
  total_likes: number;
  scraped_at: string;
}

export interface TrendsSignal {
  interest_score: number;    // 0–100 current relative search volume
  trend: "rising" | "stable" | "declining";
  related_queries: string[];
  scraped_at: string;
}

export interface SubcultureSignalData {
  reddit?: RedditSignal;
  tiktok?: TikTokSignal;
  twitter?: TwitterSignal;
  youtube?: YouTubeSignal;
  instagram?: InstagramSignal;
  trends?: TrendsSignal;
  enriched_at: string;
}

// ─── Profile (snake_case — matches tool output, maps to Prisma camelCase) ─────

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
  signal_data?: SubcultureSignalData;
}
