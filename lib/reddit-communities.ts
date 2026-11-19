/**
 * Pick which subreddits to show as a subculture's "top communities".
 *
 * Reddit search matches any post that mentions the phrase, so one viral post in
 * an unrelated subreddit (r/1000lbsisters for "sneakers") can outscore the
 * real home of the topic. Rank instead by:
 *   1. subreddit name matches the topic (r/Sneakers, r/DarkAcademia)
 *   2. number of matching posts (a community, not a one-off)
 *   3. engagement, as a tie-break
 * Unrelated subreddits with a single post are dropped entirely.
 *
 * No server imports, so the profile page can use it on stored snapshots too.
 */
import type { RedditCommunity } from "./types/subculture";

const STOP = new Set(["culture", "community", "communities", "fandom", "fans", "enthusiasts", "movement", "natives", "scene", "and", "the", "with"]);

/** Lower-case topic words (4+ letters) from names, phrases or keywords. */
export function topicWords(...texts: (string | undefined)[]): string[] {
  const words = new Set<string>();
  for (const t of texts) {
    for (const w of (t ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length >= 4 && !STOP.has(w)) words.add(w);
    }
  }
  return Array.from(words);
}

export function nameMatches(subreddit: string, words: string[]): boolean {
  const s = subreddit.toLowerCase();
  // "sneakers" ⊂ r/Sneakers; also r/vanlife ⊂ "vanlife"
  return words.some((w) => s.includes(w) || (s.length >= 5 && w.includes(s)));
}

export function rankCommunities(communities: RedditCommunity[], words: string[]): RedditCommunity[] {
  return communities
    .map((c) => ({ c, match: nameMatches(c.subreddit, words) }))
    .filter(({ c, match }) => match || c.posts_found >= 2)
    .sort((a, b) =>
      Number(b.match) - Number(a.match) ||
      b.c.posts_found - a.c.posts_found ||
      b.c.engagement - a.c.engagement)
    .map(({ c }) => c);
}
