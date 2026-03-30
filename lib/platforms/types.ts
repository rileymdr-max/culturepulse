/**
 * Unified platform data schema.
 * Every platform module — whether live or mock — must return data
 * that conforms to CommunityData. This ensures the frontend and API
 * routes never need to know which platform they're talking to.
 */

export type TrendDirection = "up" | "down" | "flat";

export interface ConversationCategory {
  label: string;
  /** Total post/comment/engagement volume in this category */
  volume: number;
  trend: TrendDirection;
}

export interface TrendingTopic {
  topic: string;
  /** Raw engagement/mention volume */
  volume: number;
  /**
   * Velocity — how fast this topic is growing.
   * Positive = accelerating, negative = decelerating.
   * Expressed as a percentage change (e.g. 42 = +42%).
   */
  velocity: number;
}

export interface TrendingContent {
  title: string;
  url: string;
  /** Aggregate engagement (likes + comments + shares, platform-normalised) */
  engagement: number;
  /** e.g. "post", "video", "article", "reel", "tweet" */
  type: string;
}

export interface TopVoice {
  name: string;
  handle: string;
  followers: number;
  url: string;
  /** Optional avatar URL */
  avatar?: string;
}

export interface CommunityData {
  platform: string;
  community_id: string;
  community_name: string;
  community_size: number;
  description: string;
  conversation_categories: ConversationCategory[];
  trending_topics: TrendingTopic[];
  trending_content: TrendingContent[];
  top_voices: TopVoice[];
  last_updated: string; // ISO 8601 timestamp
}

/** Input accepted by every platform's search function */
export interface PlatformSearchInput {
  query: string;
}

/** Standard return type for a platform search */
export interface PlatformSearchResult {
  communities: CommunityData[];
  /** True when data came from the live API, false when mock was used */
  isLive: boolean;
}

/**
 * Contract every platform module must satisfy.
 * `search` — find communities matching a free-text query.
 * `getCommunity` — fetch full data for a single community by its ID.
 */
export interface PlatformModule {
  readonly platform: string;
  search(input: PlatformSearchInput): Promise<PlatformSearchResult>;
  getCommunity(communityId: string): Promise<CommunityData | null>;
}
