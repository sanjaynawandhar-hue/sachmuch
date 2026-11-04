import { beforeAll, afterAll, it, expect } from 'vitest';
import {createDb} from '../src/client';
import { readFile } from 'node:fs/promises';
import * as repository from '../src/fact-texts';

// Deliberately refuse remote and default databases. These tests create/drop tables.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw Error('TEST_DATABASE_URL is required');
const target = new URL(url);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || !/^\/sachmuch_test_[a-z0-9_]+$/.test(target.pathname)) throw Error('Use an isolated local sachmuch_test_ database');
const {sql} = createDb(url);
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
it('withdraws a cleared legacy translation from v2 readers',async()=>{
 const {readFactV2}=await import('../src/fact-v2-repository');
 const id='00000000-0000-4000-8000-000000000002';
 await sql`UPDATE facts SET hook_en='Temporary translation',body_en='Temporary body' WHERE id=${id}`;
 expect((await readFactV2(sql,id))?.texts.en).toBeTruthy();
 await sql`UPDATE facts SET hook_en=NULL,body_en=NULL WHERE id=${id}`;
 expect((await readFactV2(sql,id))?.texts.en).toBeUndefined();
});
it('cannot move the only original text away from a live fact',async()=>{
 await expect(sql`UPDATE fact_texts SET fact_id='00000000-0000-4000-8000-000000000001' WHERE fact_id='00000000-0000-4000-8000-000000000002' AND language='hi'`).rejects.toThrow();
});
it('stores one canonical claim with two evidence records across different source renderings',async()=>{
 const {persistCandidateV2}=await import('../../../pipeline/src/persist-v2');
 await sql.unsafe(await readFile(new URL('../migrations/0003_canonical_claims.sql',import.meta.url),'utf8'));
 const candidate={claim:{subject:'Q313',predicate:'P2048',object:{kind:'quantity' as const,value:'1000',unit:'m'},qualifiers:{}},fact:{id:'00000000-0000-4000-8000-000000000004',originalLanguage:'en' as const,texts:{en:{hook:'A tested measurement',body:'This isolated fixture is not a production fact.'}},categoryId:1,categorySlug:'space',categoryLabel:'Space',categoryEmoji:'✦',sourceUrl:'https://example.org/first',publisher:'Example',licence:'cc0' as const,knowledgeKind:'fact' as const},evidence:[{url:'https://example.org/first',publisher:'Example',sourceRecordKey:'first',checkedAt:'2026-10-21T00:00:00Z',licence:'cc0' as const,reference:'Isolated measurement fixture'}],sourceVersion:'fixture-1',batchId:'test-batch'};
 const first=await persistCandidateV2(sql,candidate,'test');
 expect(first.inserted).toBe(true);
 await sql`UPDATE facts SET status='live' WHERE id=${first.id}`;
 const second=await persistCandidateV2(sql,{...candidate,fact:{...candidate.fact,id:'00000000-0000-4000-8000-000000000005',sourceUrl:'https://example.org/second'},claim:{...candidate.claim,object:{kind:'quantity',value:'1',unit:'km'}},evidence:[{...candidate.evidence[0]!,url:'https://example.org/second',sourceRecordKey:'second'}]},'test');
 expect(second).toEqual({id:first.id,inserted:false});
 expect((await sql`SELECT id FROM facts WHERE canonical_claim_key IS NOT NULL AND status='live'`)).toHaveLength(1);
 expect((await sql`SELECT id FROM fact_evidence WHERE fact_id=${first.id}`)).toHaveLength(2);
 await persistCandidateV2(sql,candidate,'test');
 expect((await sql`SELECT id FROM fact_evidence WHERE fact_id=${first.id}`)).toHaveLength(2);
});
it('resumes a bounded batch midway through a fetched page without losing or duplicating claims',async()=>{
 const {runImportBatch}=await import('../../../pipeline/src/batches');
 const {RateLimited}=await import('../../../connectors/src/types');
 await sql.unsafe(await readFile(new URL('../migrations/0004_soft_khan.sql',import.meta.url),'utf8'));

 let throttled=true;
 const connector={id:'test',async fetch(cursor:string|null){
  if(cursor==='page2'&&throttled) throw new RateLimited(1,'test');
  return {candidates:cursor===null?[makeBatchFixture(1),makeBatchFixture(2)]:[makeBatchFixture(3)],nextCursor:cursor===null?'page2':null,sourceVersion:'fixture-v1',requests:1,bytes:100};
 }};
 const opts={batchId:'resume-test',sourceId:'test',maxRecords:1,maxDurationMs:1000,dryRun:false};
 const first=await runImportBatch(opts,{sql,connector});
 expect(first.reviewPending).toBe(1);
 const second=await runImportBatch({...opts,maxRecords:10},{sql,connector});
 expect(second.reviewPending).toBe(1);
 expect(second.deferred).toBe(1);
 throttled=false;
 const third=await runImportBatch({...opts,maxRecords:10},{sql,connector});
 expect(third.reviewPending).toBe(1);
 expect(third.complete).toBe(true);
 expect((await runImportBatch(opts,{sql,connector})).candidates).toBe(0);
 expect((await sql`SELECT id FROM facts WHERE batch_id='resume-test'`)).toHaveLength(3);
 expect((await sql`SELECT id FROM facts WHERE batch_id='resume-test' AND status='live'`)).toHaveLength(0);
});
it('refuses an unbounded or mismatched batch before contacting a source',async()=>{
 const {runImportBatch}=await import('../../../pipeline/src/batches');
 const connector={id:'test',async fetch(){throw Error('must not fetch');}};
 await expect(runImportBatch({batchId:'bad',sourceId:'test',maxRecords:1001,maxDurationMs:100,dryRun:false},{sql,connector})).rejects.toThrow('Batch limits');
});

const makeBatchFixture=(n:number,batchId="resume-test")=>({claim:{subject:`batch-subject-${n}`,predicate:'observed',object:{kind:'text' as const,value:'test'},qualifiers:{}},fact:{id:`00000000-0000-4000-9000-${String(n).padStart(12,'0')}`,originalLanguage:'en' as const,texts:{en:{hook:'A complete test fixture',body:'This isolated fixture must never be published in the real app.'}},categoryId:1,categorySlug:'space',categoryLabel:'Space',categoryEmoji:'✦',sourceUrl:'https://example.org/evidence',publisher:'Example',licence:'cc0' as const,knowledgeKind:'fact' as const},evidence:[{url:'https://example.org/evidence',publisher:'Example',sourceRecordKey:String(n),checkedAt:'2026-10-21T00:00:00Z',licence:'cc0' as const,reference:'test evidence'}],sourceVersion:'fixture-v1',batchId});
it('dry-run previews candidates without creating a batch or facts',async()=>{
 const {runImportBatch}=await import('../../../pipeline/src/batches');
 const candidate=makeBatchFixture(10,'dry-test');
 const connector={id:'test',async fetch(){return {candidates:[candidate,candidate],nextCursor:null,sourceVersion:'fixture-v1',requests:1,bytes:200};}};
 const report=await runImportBatch({batchId:'dry-test',sourceId:'test',maxRecords:10,maxDurationMs:1000,dryRun:true},{sql,connector});
 expect(report).toMatchObject({reviewPending:1,duplicates:1,accepted:0,complete:true});
 expect(await sql`SELECT id FROM corpus_batches WHERE id='dry-test'`).toHaveLength(0);
 expect(await sql`SELECT id FROM facts WHERE batch_id='dry-test'`).toHaveLength(0);
});
it('keeps acquired pages but starts no processing after the duration budget',async()=>{
 const {runImportBatch}=await import('../../../pipeline/src/batches');
 let time=0;
 const connector={id:'test',async fetch(){time=200;return {candidates:[makeBatchFixture(11,'time-test')],nextCursor:null,sourceVersion:'fixture-v1',requests:1,bytes:100};}};
 const report=await runImportBatch({batchId:'time-test',sourceId:'test',maxRecords:10,maxDurationMs:100,dryRun:false},{sql,connector,now:()=>time});
 expect(report.candidates).toBe(0);
 expect((await sql`SELECT pending_page FROM corpus_batches WHERE id='time-test'`)[0]!.pending_page).toBeTruthy();
});
it('rolls back a draft if its processing checkpoint fails, then retries exactly once',async()=>{
 const {runImportBatch}=await import('../../../pipeline/src/batches');
 const connector={id:'test',async fetch(){return {candidates:[makeBatchFixture(12,'crash-test')],nextCursor:null,sourceVersion:'fixture-v1',requests:1,bytes:100};}};
 const opts={batchId:'crash-test',sourceId:'test',maxRecords:10,maxDurationMs:1000,dryRun:false};
 await sql.unsafe(`CREATE FUNCTION simulate_checkpoint_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='crash-test' AND NEW.processing_index=1 THEN RAISE EXCEPTION 'simulated checkpoint failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_checkpoint BEFORE UPDATE ON corpus_batches FOR EACH ROW EXECUTE FUNCTION simulate_checkpoint_failure()`);
 await expect(runImportBatch(opts,{sql,connector})).rejects.toThrow('simulated checkpoint failure');
 expect(await sql`SELECT id FROM facts WHERE batch_id='crash-test'`).toHaveLength(0);
 await sql`DROP TRIGGER fail_checkpoint ON corpus_batches`;
 expect((await runImportBatch(opts,{sql,connector})).reviewPending).toBe(1);
 expect((await runImportBatch(opts,{sql,connector})).candidates).toBe(0);
});
it('publishes an immutable snapshot and reads only live approved originals across pages',async()=>{
 const {buildFeedSnapshot,readSnapshotWindow}=await import('../src/feed-snapshot');
 await sql.unsafe(await readFile(new URL('../migrations/0005_nebulous_power_pack.sql',import.meta.url),'utf8'));
 const snapshot=await buildFeedSnapshot(sql,{seed:'fixture',batchSize:50});
 expect(snapshot.totalEligible).toBe(0);
 await sql`UPDATE facts SET corpus_eligible=true WHERE id='00000000-0000-4000-8000-000000000004'`;
 const next=await buildFeedSnapshot(sql,{seed:'fixture',batchSize:50});
 expect(next.totalEligible).toBe(1);
 expect((await readSnapshotWindow(sql,next.snapshotId,0)).facts).toHaveLength(1);
 expect((await readSnapshotWindow(sql,snapshot.snapshotId,0)).facts).toHaveLength(0);
 await sql`UPDATE facts SET status='hidden' WHERE id='00000000-0000-4000-8000-000000000004'`;
 const revoked=await readSnapshotWindow(sql,next.snapshotId,0);
 expect(revoked.facts).toHaveLength(0);
 expect(revoked.totalEligible).toBe(0);
 expect(revoked.position).toBe(1);
});
it('keeps 100000 synthetic claims reachable exactly once and advances past a revoked page',async()=>{
 const {buildFeedSnapshot,readSnapshotWindow}=await import('../src/feed-snapshot');
 for(let offset=0;offset<100000;offset+=1000){
 await sql.unsafe(`INSERT INTO facts(id,category_id,source_id,hook_en,body_en,source_url,publisher,licence,status,normalized_hash,canonical_claim_key,corpus_eligible)
 SELECT ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1,'test','Synthetic scale fixture','Synthetic test content: never import this into production.','https://example.org/fixture','Fixture','cc0','draft','scale-'||n,'scale-'||n,true FROM generate_series(${offset+1},${offset+1000})n`);
 }
 for(let offset=0;offset<100000;offset+=1000){
 await sql`UPDATE facts SET status='live' WHERE id IN (SELECT id FROM facts WHERE normalized_hash LIKE 'scale-%' ORDER BY id LIMIT 1000 OFFSET ${offset})`;
 }
 const snapshot=await buildFeedSnapshot(sql,{seed:'scale',batchSize:500});
 expect(snapshot.totalEligible).toBe(100000);
 const positions=await sql`SELECT count(*)::integer AS total,count(DISTINCT fact_id)::integer AS unique,min(position) AS first,max(position) AS last FROM feed_entries WHERE snapshot_id=${snapshot.snapshotId}`;
 expect(positions[0]).toEqual({total:100000,unique:100000,first:1,last:100000});
 const first=await readSnapshotWindow(sql,snapshot.snapshotId,0);
 expect(first.facts).toHaveLength(50);
 expect(first.position).toBe(50);
 await sql`UPDATE facts SET status='hidden' WHERE id IN (SELECT fact_id FROM feed_entries WHERE snapshot_id=${snapshot.snapshotId} AND position BETWEEN 51 AND 100)`;
 const empty=await readSnapshotWindow(sql,snapshot.snapshotId,50);
 expect(empty.facts).toHaveLength(0);
 expect(empty.position).toBe(100);
 expect(empty.hasMore).toBe(true);
 expect(empty.totalEligible).toBe(99950);
 expect((await readSnapshotWindow(sql,snapshot.snapshotId,100)).facts).toHaveLength(50);
 const final=await readSnapshotWindow(sql,snapshot.snapshotId,99950);
 expect(final.facts).toHaveLength(50);
 expect(final.hasMore).toBe(false);
},180000);
