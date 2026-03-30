/**
 * Community similarity scoring.
 * Computes a 0–100 score between two CommunityData objects based on
 * overlapping topics, conversation category patterns, and size proximity.
 */

import type { CommunityData } from "@/lib/platforms/types";

/**
 * Computes a similarity score (0–100) between two communities.
 * Higher = more similar.
 *
 * Weighted components:
 *   40% — topic overlap (Jaccard similarity on trending topic strings)
 *   30% — category pattern (cosine similarity on category volume vectors)
 *   20% — size proximity (log-scale closeness)
 *   10% — same platform bonus
 */
export function computeSimilarity(a: CommunityData, b: CommunityData): number {
  const topicScore = topicJaccard(a, b) * 40;
  const categoryScore = categoryCosineSimilarity(a, b) * 30;
  const sizeScore = sizeProximity(a, b) * 20;
  const platformScore = a.platform === b.platform ? 10 : 0;

  return Math.round(topicScore + categoryScore + sizeScore + platformScore);
}

/**
 * Pairwise similarity matrix for N communities.
 * Returns a Record keyed by "idA::idB" with the score.
 */
export function computePairwiseScores(
  communities: CommunityData[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (let i = 0; i < communities.length; i++) {
    for (let j = i + 1; j < communities.length; j++) {
      const key = `${communities[i].community_id}::${communities[j].community_id}`;
      scores[key] = computeSimilarity(communities[i], communities[j]);
    }
  }
  return scores;
}

// ─── Component scorers ────────────────────────────────────────────────────────

/** Jaccard similarity on the set of topic strings (lowercased, stripped of #). */
function topicJaccard(a: CommunityData, b: CommunityData): number {
  const setA = new Set(a.trending_topics.map((t) => t.topic.toLowerCase().replace(/^#/, "")));
  const setB = new Set(b.trending_topics.map((t) => t.topic.toLowerCase().replace(/^#/, "")));
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Cosine similarity between the two communities' conversation category volume vectors.
 * Aligns on shared category labels.
 */
function categoryCosineSimilarity(a: CommunityData, b: CommunityData): number {
  const labelsA: Record<string, number> = {};
  for (const cat of a.conversation_categories) labelsA[cat.label] = cat.volume;

  const labelsB: Record<string, number> = {};
  for (const cat of b.conversation_categories) labelsB[cat.label] = cat.volume;

  const allLabels = new Set([...Object.keys(labelsA), ...Object.keys(labelsB)]);
  let dot = 0, magA = 0, magB = 0;

  for (const label of allLabels) {
    const va = labelsA[label] ?? 0;
    const vb = labelsB[label] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Returns a 0–1 score based on how close the two community sizes are on a log scale.
 * Communities within the same order of magnitude score near 1.
 */
function sizeProximity(a: CommunityData, b: CommunityData): number {
  if (a.community_size === 0 || b.community_size === 0) return 0;
  const logA = Math.log10(a.community_size);
  const logB = Math.log10(b.community_size);
  const diff = Math.abs(logA - logB);
  // Max expected log-scale difference across platforms ≈ 4 orders of magnitude
  return Math.max(0, 1 - diff / 4);
}
