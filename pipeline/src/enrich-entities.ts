/**
 * Fills in entity labels, descriptions and images.
 *
 * The ingest path writes a bare QID into `entities` so the foreign key holds,
 * and nothing has filled them in until now — which is why entity chips were
 * showing "Q465848" and why the card had a large empty area above the hook.
 *
 * Two calls per batch: Wikidata for labels and the P18 filename, then Commons
 * for that file's licence and author. Commons images are individually licensed
 * and several require visible credit, so the credit is stored next to the URL
 * rather than left for the card to remember.
 *
 * Run: node --env-file=.env pnpm --filter @sachmuch/pipeline exec tsx src/enrich-entities.ts
 */
import { sql } from 'drizzle-orm';
import { createDb } from '@sachmuch/db';
import { USER_AGENT } from '@sachmuch/connectors';

const BATCH = 50;
const { db, sql: raw } = createDb();

interface WdEntity {
  missing?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value: unknown } } }[]>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Commons serves a resized copy through Special:FilePath, which is what we want. */
function commonsThumb(file: string, width = 900): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

/** Strips the HTML Commons puts in its metadata fields. */
function plain(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text.slice(0, 200) : undefined;
}

interface ImageMeta { licence?: string; credit?: string }

async function commonsMetadata(files: string[]): Promise<Map<string, ImageMeta>> {
  const out = new Map<string, ImageMeta>();
  for (let i = 0; i < files.length; i += 20) {
    const batch = files.slice(i, i + 20);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
      `&iiprop=extmetadata&titles=${batch.map((f) => encodeURIComponent(`File:${f}`)).join('|')}`;
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, {
        title?: string;
        imageinfo?: { extmetadata?: Record<string, { value?: string }> }[];
      }> };
    };
    for (const page of Object.values(json.query?.pages ?? {})) {
      const file = page.title?.replace(/^File:/, '');
      const meta = page.imageinfo?.[0]?.extmetadata;
      if (!file) continue;
      out.set(file, {
        ...(plain(meta?.LicenseShortName?.value) ? { licence: plain(meta!.LicenseShortName!.value) } : {}),
        ...(plain(meta?.Artist?.value) ? { credit: plain(meta!.Artist!.value) } : {}),
      });
    }
    await sleep(200);
  }
  return out;
}

const pending = await db.execute<{ qid: string }>(sql`
  SELECT qid FROM entities WHERE enriched_at IS NULL ORDER BY fact_count DESC
`);
console.log(`${pending.length} entities to enrich`);

let labelled = 0, imaged = 0, hindi = 0;

for (let i = 0; i < pending.length; i += BATCH) {
  const batch = pending.slice(i, i + BATCH).map((r) => r.qid);
  const res = await fetch(
    'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json' +
      `&props=labels|descriptions|claims&languages=en|hi&ids=${batch.join('|')}`,
    { headers: { 'user-agent': USER_AGENT } },
  );
  if (!res.ok) { console.warn(`batch ${i}: HTTP ${res.status}`); continue; }
  const json = (await res.json()) as { entities?: Record<string, WdEntity> };

  const files: string[] = [];
  const staged: { qid: string; labelEn: string; labelHi?: string; descEn?: string; descHi?: string; file?: string; kind: string }[] = [];

  for (const qid of batch) {
    const e = json.entities?.[qid];
    if (!e || e.missing !== undefined) {
      await db.execute(sql`UPDATE entities SET enriched_at = now() WHERE qid = ${qid}`);
      continue;
    }
    const file = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const instanceOf = e.claims?.P31?.[0]?.mainsnak?.datavalue?.value as { id?: string } | undefined;
    const kind =
      instanceOf?.id === 'Q5' ? 'human'
      : instanceOf?.id === 'Q11424' ? 'film'
      : instanceOf?.id === 'Q3624078' || instanceOf?.id === 'Q12443800' ? 'place'
      : 'other';

    staged.push({
      qid,
      labelEn: e.labels?.en?.value ?? qid,
      ...(e.labels?.hi?.value ? { labelHi: e.labels.hi.value } : {}),
      ...(e.descriptions?.en?.value ? { descEn: e.descriptions.en.value } : {}),
      ...(e.descriptions?.hi?.value ? { descHi: e.descriptions.hi.value } : {}),
      ...(typeof file === 'string' ? { file } : {}),
      kind,
    });
    if (typeof file === 'string') files.push(file);
  }

  const meta = await commonsMetadata(files);

  for (const s of staged) {
    const m = s.file ? meta.get(s.file) : undefined;
    await db.execute(sql`
      UPDATE entities SET
        label_en = ${s.labelEn},
        label_hi = ${s.labelHi ?? null},
        description_en = ${s.descEn ?? null},
        description_hi = ${s.descHi ?? null},
        kind = ${s.kind},
        image_url = ${s.file ? commonsThumb(s.file) : null},
        image_licence = ${m?.licence ?? null},
        image_credit = ${m?.credit ?? null},
        enriched_at = now(),
        updated_at = now()
      WHERE qid = ${s.qid}
    `);
    labelled++;
    if (s.file) imaged++;
    if (s.labelHi) hindi++;
  }

  console.log(`  ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  await sleep(250);
}

console.log(`\nlabelled: ${labelled}`);
console.log(`with an image: ${imaged}`);
console.log(`with a Hindi label: ${hindi}`);
await raw.end();
