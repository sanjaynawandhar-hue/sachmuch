import 'server-only';
import postgres from 'postgres';
import type { FactCardData } from '@sachmuch/ui';

/**
 * Reads live facts for the feed.
 *
 * Both languages come back on the same row so the client can switch between
 * them without a round trip — a fact is one fact, rendered in one language or
 * the other, not two records.
 */
const sql = postgres(process.env.DATABASE_URL ?? '', { max: 2, prepare: false });

interface FactRow {
  id: string;
  category_id: number;
  category_slug: string;
  name_en: string;
  name_hi: string;
  emoji: string;
  hook_en: string;
  body_en: string;
  hook_hi: string | null;
  body_hi: string | null;
  hi_missing: boolean;
  source_url: string;
  publisher: string;
  licence: FactCardData['licence'];
  attribution_text: string | null;
  corroboration_count: number;
  difficulty: number;
  quality: number;
  template_id: string | null;
  boost_count: number;
  image_url: string | null;
  image_licence: string | null;
  image_credit: string | null;
  image_alt_en: string | null;
  image_alt_hi: string | null;
  entities: { qid: string; en: string; hi: string | null }[] | null;
}

export interface BilingualFact {
  en: FactCardData;
  /** Absent when the fact never got a Hindi rendering. */
  hi?: FactCardData;
}

export async function getFeedFacts(limit = 300): Promise<BilingualFact[]> {
  const rows = await sql<FactRow[]>`
    SELECT f.id, f.category_id, c.slug AS category_slug, c.name_en, c.name_hi, c.emoji,
           f.hook_en, f.body_en, f.hook_hi, f.body_hi, f.hi_missing,
           f.source_url, f.publisher, f.licence, f.attribution_text,
           f.corroboration_count, f.difficulty, f.quality, f.template_id, f.boost_count,
           img.image_url, img.image_licence, img.image_credit,
           img.label_en AS image_alt_en, img.label_hi AS image_alt_hi,
           (
             SELECT json_agg(json_build_object('qid', e.qid, 'en', e.label_en, 'hi', e.label_hi))
               FROM fact_entities fe JOIN entities e ON e.qid = fe.qid
              WHERE fe.fact_id = f.id
           ) AS entities
      FROM facts f
      JOIN categories c ON c.id = f.category_id
      -- The best available image among the fact's entities. Ordered by fact_count
      -- so the better-known entity wins when a fact has several.
      LEFT JOIN LATERAL (
        SELECT e.image_url, e.image_licence, e.image_credit, e.label_en, e.label_hi
          FROM fact_entities fe JOIN entities e ON e.qid = fe.qid
         WHERE fe.fact_id = f.id AND e.image_url IS NOT NULL
         ORDER BY e.fact_count DESC
         LIMIT 1
      ) img ON true
     WHERE f.status = 'live'
     ORDER BY f.boost_count DESC, f.quality DESC, f.id
     LIMIT ${limit}
  `;

  return rows.map((r) => {
    const shared = {
      id: r.id,
      categoryId: r.category_id,
      categorySlug: r.category_slug,
      categoryEmoji: r.emoji,
      sourceUrl: r.source_url,
      publisher: r.publisher,
      licence: r.licence,
      corroborationCount: r.corroboration_count,
      difficulty: r.difficulty,
      quality: r.quality,
      ...(r.template_id ? { templateId: r.template_id } : {}),
      boostCount: r.boost_count,
      ...(r.attribution_text ? { attributionText: r.attribution_text } : {}),
    };

    const image = r.image_url
      ? {
          url: r.image_url,
          ...(r.image_licence ? { licence: r.image_licence } : {}),
          ...(r.image_credit ? { credit: r.image_credit } : {}),
        }
      : undefined;
    // Entity labels are stored as the QID until an entity-enrichment pass fills
    // them in, so anything still looking like a bare QID is hidden rather than
    // shown as "Q465848".
    const entities = (r.entities ?? [])
      .filter((e) => e.en && !/^Q\d+$/.test(e.en))
      .map((e) => ({ qid: e.qid, label: e.en }));

    const en: FactCardData = {
      ...shared, categoryLabel: r.name_en, hook: r.hook_en, body: r.body_en, entities,
      ...(image ? { image: { ...image, alt: r.image_alt_en ?? '' } } : {}),
    };

    if (r.hi_missing || !r.hook_hi || !r.body_hi) return { en };

    return {
      en,
      hi: {
        ...shared,
        id: r.id,
        categoryLabel: r.name_hi,
        hook: r.hook_hi,
        body: r.body_hi,
        entities: (r.entities ?? [])
          .filter((e) => e.hi && !/^Q\d+$/.test(e.hi!))
          .map((e) => ({ qid: e.qid, label: e.hi! })),
        ...(image ? { image: { ...image, alt: r.image_alt_hi ?? r.image_alt_en ?? '' } } : {}),
      },
    };
  });
}
