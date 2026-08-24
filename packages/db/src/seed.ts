/**
 * Seeds the taxonomy and the source registry. Idempotent — safe to re-run after
 * adding a category or a subtopic.
 *
 * Run: DATABASE_URL=... pnpm --filter @sachmuch/db seed
 */
import { sql } from 'drizzle-orm';
import { categoryTint } from '@sachmuch/ui/tokens';
import { createDb } from './client';
import { categories, subtopics, sources, templates } from './schema';
import { TAXONOMY, CATEGORY_COUNT } from './taxonomy';
import { SOURCE_REGISTRY } from './sources';
import { TEMPLATES } from '@sachmuch/templates/library';

const { db, sql: raw } = createDb();

console.log(`seeding ${CATEGORY_COUNT} categories...`);

for (const c of TAXONOMY) {
  const position = c.id - 1;
  const light = categoryTint(position, CATEGORY_COUNT, 'light');
  const dark = categoryTint(position, CATEGORY_COUNT, 'dark');

  await db
    .insert(categories)
    .values({
      id: c.id,
      slug: c.slug,
      nameEn: c.en,
      nameHi: c.hi,
      position,
      tintBg: light.bg,
      tintSurface: light.surface,
      tintAccent: light.accent,
      tintDarkBg: dark.bg,
      tintDarkSurface: dark.surface,
      tintDarkAccent: dark.accent,
      emoji: c.emoji,
      kidsSafe: c.kidsSafe,
    })
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        slug: c.slug, nameEn: c.en, nameHi: c.hi, position,
        tintBg: light.bg, tintSurface: light.surface, tintAccent: light.accent,
        tintDarkBg: dark.bg, tintDarkSurface: dark.surface, tintDarkAccent: dark.accent,
        emoji: c.emoji, kidsSafe: c.kidsSafe,
      },
    });
}

let subtopicCount = 0;
for (const c of TAXONOMY) {
  for (const s of c.subtopics) {
    await db
      .insert(subtopics)
      .values({
        categoryId: c.id,
        slug: s.slug,
        nameEn: s.en,
        nameHi: s.hi,
        hints: { ...(s.qids ? { qids: s.qids } : {}), ...(s.keywords ? { keywords: s.keywords } : {}) },
      })
      .onConflictDoUpdate({
        target: [subtopics.categoryId, subtopics.slug],
        set: {
          nameEn: s.en,
          nameHi: s.hi,
          hints: { ...(s.qids ? { qids: s.qids } : {}), ...(s.keywords ? { keywords: s.keywords } : {}) },
        },
      });
    subtopicCount++;
  }
}
console.log(`seeded ${subtopicCount} subtopics`);

console.log(`seeding ${SOURCE_REGISTRY.length} sources...`);
for (const s of SOURCE_REGISTRY) {
  await db.insert(sources).values(s).onConflictDoUpdate({
    target: sources.id,
    set: {
      name: s.name, publisher: s.publisher, homepage: s.homepage, kind: s.kind,
      licence: s.licence, attributionRequired: s.attributionRequired,
      attributionText: s.attributionText ?? null, rateLimitRpm: s.rateLimitRpm,
      needsKey: s.needsKey, schedule: s.schedule, notes: s.notes ?? null,
    },
  });
}

// `facts.template_id` is a foreign key, so a template must exist as a row before
// the pipeline can write anything it produced.
console.log(`seeding ${TEMPLATES.length} templates...`);
for (const t of TEMPLATES) {
  await db.insert(templates).values({
    id: t.id,
    sourceId: t.sourceId,
    categoryId: t.categoryId,
    decays: t.decays,
    patternCount: t.hook.en.length,
  }).onConflictDoUpdate({
    target: templates.id,
    set: { sourceId: t.sourceId, categoryId: t.categoryId, decays: t.decays, patternCount: t.hook.en.length },
  });
}

const rows = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM categories`);
console.log(`done — ${rows[0]?.count ?? 0} categories in the database`);

await raw.end();
