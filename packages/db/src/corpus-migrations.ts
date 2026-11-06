import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import type {Sql} from 'postgres';
const files=['0002_fact_texts.sql','0003_canonical_claims.sql','0004_soft_khan.sql','0005_nebulous_power_pack.sql'];
/** Existing production was bootstrapped without a Drizzle journal. Apply only
 * additive corpus migrations, with an independent checksum ledger and in-DB backup. */
export async function migrateCorpus(sql:Sql):Promise<{applied:string[];backupId:string|null}>{
 const migrations=await Promise.all(files.map(async name=>{
  const source=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8');
  return {name,source,hash:createHash('sha256').update(source).digest('hex')};
 }));
 return sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(727461924)`;
  await tx`SET LOCAL lock_timeout='10s'`;
  await tx`SET LOCAL statement_timeout='60s'`;
  await tx`CREATE TABLE IF NOT EXISTS corpus_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`;
  await tx`ALTER TABLE corpus_migrations ENABLE ROW LEVEL SECURITY`;
  const previous=await tx`SELECT name,sha256 FROM corpus_migrations`;
  for(const item of previous){
   const migration=migrations.find(m=>m.name===item.name);
   if(!migration||migration.hash!==item.sha256)throw Error('Migration history mismatch');
  }
  const pending=migrations.filter(m=>!previous.some(p=>p.name===m.name));
  if(!pending.length)return {applied:[],backupId:null};
  // Avoid adopting partially/manual-applied schema without an explicit reconciliation.
  if(!previous.length){
   const existing=await tx`SELECT to_regclass('public.fact_texts') AS texts`;
   if(existing[0]?.texts)throw Error('Existing corpus schema needs migration-history reconciliation');
  }
  await tx`CREATE TABLE IF NOT EXISTS corpus_rollout_backups(id uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),facts jsonb NOT NULL)`;
  await tx`ALTER TABLE corpus_rollout_backups ENABLE ROW LEVEL SECURITY`;
  await tx`LOCK TABLE facts IN SHARE MODE`;
  const backupId=randomUUID();
  await tx`INSERT INTO corpus_rollout_backups(id,facts) SELECT ${backupId},coalesce(jsonb_agg(to_jsonb(f) ORDER BY id),'[]'::jsonb) FROM facts f`;
  const originalColumns=await tx`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='facts' ORDER BY ordinal_position`;
  for(const migration of pending){
   for(const statement of migration.source.split('--> statement-breakpoint'))if(statement.trim())await tx.unsafe(statement);
   await tx`INSERT INTO corpus_migrations(name,sha256) VALUES(${migration.name},${migration.hash})`;
  }
  for(const table of ['fact_texts','fact_evidence','corpus_batches','feed_snapshots','feed_entries'])await tx.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  // Compare every pre-existing field, not just a row count, while writes remain locked.
  const names=originalColumns.map(r=>'"'+String(r.column_name).replaceAll('"','""')+'"').join(',');
  const verified=await tx.unsafe(`SELECT b.facts=coalesce((SELECT jsonb_agg(to_jsonb(old) ORDER BY id) FROM (SELECT ${names} FROM facts) old),'[]'::jsonb) AS unchanged FROM corpus_rollout_backups b WHERE id=$1::uuid`,[backupId]);
  if(!verified[0]?.unchanged)throw Error('Legacy facts changed during additive migration');
  return {applied:pending.map(m=>m.name),backupId};
 });
}
