import { describe, expect, it } from 'vitest';
import { ALL_SUBTOPICS, TAXONOMY } from '@sachmuch/db';
import { draftFromRow } from '@sachmuch/templates';
import { TEMPLATES, validateLibrary } from '@sachmuch/templates/library';

/**
 * Lives in `pipeline` because it is the only package that depends on both the
 * template library and the taxonomy. Written after a template shipped with four
 * invented subtopic slugs: nothing failed, the connector simply produced no
 * tasks for them, and the subtopics stayed empty in silence.
 */
describe('templates against the taxonomy', () => {
  const known = new Set(ALL_SUBTOPICS.map(({ subtopic }) => subtopic.slug));
  const categoryIds = new Set(TAXONOMY.map((c) => c.id));

  it('is structurally valid', () => {
    expect(validateLibrary()).toEqual([]);
  });

  it('makes every template justify why its output is worth knowing', () => {
    // A row-level fact ("won an award in 1955") is not a fact — somebody wins
    // every year. Each template has to name how its output is distinguished.
    for (const t of TEMPLATES) {
      expect(t.significance, `${t.id} declares no significance`).toBeTruthy();
    }
  });

  it('references only subtopic slugs that actually exist', () => {
    const invented = TEMPLATES.flatMap((t) =>
      t.subtopics.filter((s) => !known.has(s)).map((s) => `${t.id} -> ${s}`));
    expect(invented).toEqual([]);
  });

  it('references only real category ids', () => {
    for (const t of TEMPLATES) expect(categoryIds.has(t.categoryId), `${t.id}`).toBe(true);
  });

  it("files a fact under its SUBTOPIC's category, not the template's", () => {
    // A template may legitimately span categories, so the routing has to come
    // from the subtopic. Asserted directly rather than by finding a spanning
    // template in the library, because whether one exists changes with content.
    const categoryOf = new Map(
      ALL_SUBTOPICS.map(({ category, subtopic }) => [subtopic.slug, category.id]),
    );
    const template = TEMPLATES.find((t) => t.subtopics.length > 0)!;
    const row = {
      person: { en: 'A Person', hi: 'एक व्यक्ति', qid: 'Q1', gender: 'female' as const },
      awardGroup: { en: 'Some Awards', hi: 'कुछ पुरस्कार', qid: 'Q2' },
      wins: { number: 7 },
      firstWin: { date: '1975-01-01T00:00:00Z' },
      lastWin: { date: '1991-01-01T00:00:00Z' },
      article: { en: 'https://en.wikipedia.org/wiki/X' },
    };

    // The subtopic's category always wins, including when it differs from the
    // template's own categoryId.
    const foreign = template.categoryId === 1 ? 2 : 1;
    const overridden = draftFromRow(template, row, { subtopicSlug: template.subtopics[0]!, categoryId: foreign });
    expect(overridden?.categoryId).toBe(foreign);

    // And with no subtopic, it falls back to the template's own category.
    const fallback = draftFromRow(template, row, {});
    expect(fallback?.categoryId).toBe(template.categoryId);

    // Every declared subtopic resolves to a real category.
    for (const slug of template.subtopics) {
      expect(categoryOf.get(slug), `${template.id} -> ${slug}`).toBeDefined();
    }
  });
});
