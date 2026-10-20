import { beforeAll, afterAll, it, expect } from 'vitest';
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import * as repository from '../src/fact-texts';

// Deliberately refuse remote and default databases. These tests create/drop tables.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw Error('TEST_DATABASE_URL is required');
const target = new URL(url);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || !/^\/sachmuch_test_[a-z0-9_]+$/.test(target.pathname)) throw Error('Use an isolated local sachmuch_test_ database');
const sql = postgres(url, {max:1,onnotice:()=>{}});
beforeAll(async () => {
 await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 await sql.unsafe(await readFile(new URL('../migrations/0000_init.sql', import.meta.url), 'utf8'));
 await sql.unsafe(await readFile(new URL('../migrations/0002_fact_texts.sql', import.meta.url), 'utf8'));
 await sql`INSERT INTO categories (id,slug,name_en,name_hi,position,tint_bg,tint_surface,tint_accent,tint_dark_bg,tint_dark_surface,tint_dark_accent,emoji) VALUES (1,'space','Space','अंतरिक्ष',1,'#000','#000','#000','#000','#000','#000','🪐')`;
 await sql`INSERT INTO sources (id,name,publisher,homepage,kind,licence,attribution_required,rate_limit_rpm,schedule) VALUES ('test','Test','NASA','https://science.nasa.gov','rest','cc0',false,1,'manual')`;
 for (const [id, hookHi, bodyHi] of [['00000000-0000-4000-8000-000000000001',null,null],['00000000-0000-4000-8000-000000000002','हुक','तथ्य'],['00000000-0000-4000-8000-000000000003','अधूरा',null]] as const) {
  await sql`INSERT INTO facts(id,category_id,source_id,hook_en,body_en,hook_hi,body_hi,source_url,publisher,licence,status,normalized_hash) VALUES (${id},1,'test','English hook','English body',${hookHi},${bodyHi},'https://science.nasa.gov','NASA','cc0','live',${id})`;
 }
});
afterAll(async () => { await sql.end(); });
it('backfills complete texts once, preserves IDs and flags partial Hindi', async () => {
 expect(await repository.backfillFactTexts(sql)).toEqual({inserted:4,invalid:1});
 expect(await repository.backfillFactTexts(sql)).toEqual({inserted:0,invalid:1});
 const rows = await sql`SELECT fact_id,language,hook,review_state FROM fact_texts ORDER BY fact_id,language`;
 expect(rows).toHaveLength(4);
 expect(rows[0]!.fact_id).toBe('00000000-0000-4000-8000-000000000001');
 expect(rows.filter(r => r.language === 'hi')).toHaveLength(1);
 expect((await sql`SELECT id FROM facts WHERE status='live' AND hook_en IS NOT NULL`)).toHaveLength(3);
});
it('does not overwrite reviewed text on another backfill', async () => {
 await sql`UPDATE fact_texts SET body='Reviewed correction' WHERE language='en'`;
 await repository.backfillFactTexts(sql);
 expect((await sql`SELECT DISTINCT body FROM fact_texts WHERE language='en'`)[0]!.body).toBe('Reviewed correction');
});
it('rejects empty text and unsupported language at the database boundary', async () => {
 await expect(sql`UPDATE fact_texts SET hook='   ' WHERE language='en'`).rejects.toThrow();
 await expect(sql`UPDATE fact_texts SET language='fr' WHERE language='en'`).rejects.toThrow();
});

it('reads complete live variants and atomically dual-writes corrected text', async () => {
 const {readFactV2,writeFactV2} = await import('../src/fact-v2-repository');
 const id = '00000000-0000-4000-8000-000000000002';
 const fact = await readFactV2(sql,id);
 expect(fact?.texts.hi?.body).toBe('तथ्य');
 expect(fact?.originalLanguage).toBe('en');
 await writeFactV2(sql,{...fact!,texts:{en:{hook:'Corrected hook',body:'Corrected body'}}});
 expect((await sql`SELECT hook_en,body_hi,hi_missing FROM facts WHERE id=${id}`)[0]).toEqual({hook_en:'Corrected hook',body_hi:null,hi_missing:true});
 expect((await readFactV2(sql,id))?.texts.hi).toBeUndefined();
});
it('does not expose hidden facts or unapproved text',async()=>{
 const {readFactV2} = await import('../src/fact-v2-repository');
 const id='00000000-0000-4000-8000-000000000001';
 await sql`UPDATE fact_texts SET review_state='pending' WHERE fact_id=${id}`;
 expect(await readFactV2(sql,id)).toBeNull();
 await sql`UPDATE facts SET status='hidden' WHERE id=${id}`;
 expect(await readFactV2(sql,id)).toBeNull();
});
it('Hindi-only writes fail atomically until the compatibility migration',async()=>{
 const {readFactV2,writeFactV2} = await import('../src/fact-v2-repository');
 const id='00000000-0000-4000-8000-000000000002';
 const fact=(await readFactV2(sql,id))!;
 await expect(writeFactV2(sql,{...fact,originalLanguage:'hi',texts:{hi:{hook:'हुक',body:'तथ्य'}}})).rejects.toThrow();
 expect((await readFactV2(sql,id))?.texts.en?.body).toBe('Corrected body');
});
it('publishes Hindi-only after compatibility migration and prevents losing its approved original',async()=>{
 const {readFactV2,writeFactV2}=await import('../src/fact-v2-repository');
 const id='00000000-0000-4000-8000-000000000002';
 const fact=(await readFactV2(sql,id))!;
 await sql.unsafe(await readFile(new URL('../rollout/enable-hindi-only.sql',import.meta.url),'utf8'));
 await writeFactV2(sql,{...fact,originalLanguage:'hi',texts:{hi:{hook:'हुक',body:'तथ्य'}}});
 expect((await readFactV2(sql,id))?.texts).toEqual({hi:{hook:'हुक',body:'तथ्य'}});
 await expect(sql`DELETE FROM fact_texts WHERE fact_id=${id}`).rejects.toThrow();
 await expect(sql`UPDATE fact_texts SET review_state='pending' WHERE fact_id=${id}`).rejects.toThrow();
 expect((await sql`SELECT id FROM facts WHERE status='live' AND hook_en IS NOT NULL AND body_en IS NOT NULL`).map(r=>r.id)).not.toContain(id);
});
