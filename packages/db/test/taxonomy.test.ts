import { describe, expect, it } from 'vitest';
import { TAXONOMY, CATEGORY_COUNT, subtopicQids, ALL_SUBTOPICS } from '../src/taxonomy';

describe('taxonomy', () => {
  it('holds exactly the 29 categories the spec asks for', () => {
    expect(CATEGORY_COUNT).toBe(29);
  });

  it('uses ids 1..29 with no gaps and no repeats', () => {
    expect(TAXONOMY.map((c) => c.id).sort((a, b) => a - b))
      .toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });

  it('has unique category slugs', () => {
    expect(new Set(TAXONOMY.map((c) => c.slug)).size).toBe(29);
  });

  it('gives every category 25–40 subtopics', () => {
    for (const c of TAXONOMY) {
      expect(c.subtopics.length, `${c.slug} has ${c.subtopics.length}`).toBeGreaterThanOrEqual(25);
      expect(c.subtopics.length, `${c.slug} has ${c.subtopics.length}`).toBeLessThanOrEqual(40);
    }
  });

  it('has globally unique subtopic slugs, so a slug alone identifies a subtopic', () => {
    const slugs = TAXONOMY.flatMap((c) => c.subtopics.map((s) => s.slug));
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it('gives every category and subtopic real Hindi in Devanagari', () => {
    const devanagari = /[ऀ-ॿ]/;
    for (const c of TAXONOMY) {
      expect(devanagari.test(c.hi), `category ${c.slug}`).toBe(true);
      for (const s of c.subtopics) {
        expect(devanagari.test(s.hi), `subtopic ${s.slug}: "${s.hi}"`).toBe(true);
        expect(s.hi.trim().length, `subtopic ${s.slug} Hindi is empty`).toBeGreaterThan(1);
      }
    }
  });

  it('gives every subtopic keywords, since keywords carry the non-SPARQL connectors', () => {
    for (const { subtopic: s } of ALL_SUBTOPICS) {
      expect(s.keywords?.length ?? 0, `${s.slug} has no keywords`).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses well-formed QIDs where it has them at all', () => {
    for (const { subtopic: s } of ALL_SUBTOPICS) {
      for (const q of s.qids ?? []) expect(q, `${s.slug}`).toMatch(/^Q\d+$/);
    }
  });

  it('exposes subtopic QIDs by slug for connector injection', () => {
    const withQids = ALL_SUBTOPICS.find(({ subtopic }) => (subtopic.qids?.length ?? 0) > 0)!;
    expect(subtopicQids(withQids.subtopic.slug)).toEqual(withQids.subtopic.qids);
    expect(subtopicQids('no-such-subtopic')).toEqual([]);
  });
});
