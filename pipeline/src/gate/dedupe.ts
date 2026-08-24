import { createHash } from 'node:crypto';
import type { FactDraft } from '@sachmuch/templates';

/**
 * §7.3 — duplicate detection without a model.
 *
 * Two layers: an exact match on a normalised hash catches re-ingestion of the
 * same row, and pg_trgm similarity above 0.85 within the same category catches
 * two templates that arrived at the same claim by different routes. Template
 * output is formulaic, which is exactly the case where trigram similarity works
 * and embeddings would be an expensive way to learn the same thing.
 */

/**
 * Normalisation is aggressive on purpose. Two facts that differ only by
 * phrasing variant, article, or digit grouping are the same fact.
 */
export function normalizeForHash(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    // Digit grouping is presentational, and must go BEFORE punctuation stripping
    // or the commas inside 1,00,000 become spaces first.
    .replace(/(\d),(?=\d)/g, '$1')
    // strip Devanagari and Latin punctuation alike
    .replace(/[.,;:!?'"“”‘’()\[\]{}—–\-।]/g, ' ')
    .replace(/\b(the|a|an|of|in|on|at|to|for|and)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The hash keys on ROW IDENTITY, not on one phrasing of it.
 *
 * A first cut hashed the normalised hook. That was wrong in both directions:
 * sorting the words to make phrasing variants collide would also merge "India
 * beat Australia" with "Australia beat India", and not sorting them meant the
 * same row re-ingested after a template edit looked like a new fact.
 *
 * `rowKey` already identifies the row exactly — template plus every binding — so
 * re-ingestion collides and reversed relations do not. Claims that two different
 * templates arrived at independently are caught by the trigram layer below,
 * which is what that layer is for.
 */
export function factHash(
  d: Pick<FactDraft, 'categoryId' | 'rowKey'> & Partial<Pick<FactDraft, 'hookEn'>>,
): string {
  const claim = d.rowKey
    ? `${d.categoryId}|${d.rowKey}`
    : `${d.categoryId}|hook:${normalizeForHash(d.hookEn ?? '')}`;
  return createHash('sha256').update(claim).digest('hex').slice(0, 40);
}

/** Trigram set, matching how pg_trgm builds them (padded, lowercased). */
export function trigrams(text: string): Set<string> {
  const s = `  ${normalizeForHash(text)} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Mirrors pg_trgm's similarity() so the app and the database agree. */
export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / (A.size + B.size - shared);
}

export const DUPLICATE_THRESHOLD = 0.85;

/**
 * Text similarity alone is not duplication.
 *
 * Templates from one factory share their whole sentence skeleton — "X ranks 1st
 * among the largest Y on earth, at N" — so "Mount Everest ranks 1st among the
 * highest mountains" and "Sahara ranks 1st among the largest deserts" score well
 * over 0.85 on trigrams while being completely different facts. A text-only
 * check silently swallowed an entire template: 101 drafts in, 101 "duplicates",
 * nothing published.
 *
 * Two facts are the same claim only if they read alike AND are about the same
 * thing. Sharing no entity is proof they are not the same claim, whatever the
 * wording. When neither side carries an entity there is nothing to compare on,
 * so text similarity is all we have and is used alone.
 */
export function isNearDuplicate(
  a: string,
  b: string,
  entitiesA: readonly string[] = [],
  entitiesB: readonly string[] = [],
): boolean {
  if (trigramSimilarity(a, b) < DUPLICATE_THRESHOLD) return false;
  if (entitiesA.length === 0 || entitiesB.length === 0) return true;
  return entitiesA.some((q) => entitiesB.includes(q));
}

/** In-batch dedupe, before anything touches the database. */
export function dedupeBatch(drafts: FactDraft[]): {
  kept: FactDraft[];
  dropped: { draft: FactDraft; reason: string }[];
} {
  const kept: FactDraft[] = [];
  const dropped: { draft: FactDraft; reason: string }[] = [];
  const seenHashes = new Set<string>();
  // Compare only within a category, which is both correct and what keeps this
  // from going quadratic across a 100k batch.
  const byCategory = new Map<number, { hook: string; entities: string[] }[]>();

  for (const d of drafts) {
    const h = factHash(d);
    if (seenHashes.has(h)) {
      dropped.push({ draft: d, reason: 'exact_duplicate' });
      continue;
    }
    const peers = byCategory.get(d.categoryId) ?? [];
    const near = peers.find((p) => isNearDuplicate(p.hook, d.hookEn, p.entities, d.entityQids));
    if (near) {
      dropped.push({ draft: d, reason: 'near_duplicate' });
      continue;
    }
    seenHashes.add(h);
    peers.push({ hook: d.hookEn, entities: d.entityQids });
    byCategory.set(d.categoryId, peers);
    kept.push(d);
  }
  return { kept, dropped };
}
