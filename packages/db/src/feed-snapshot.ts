import {SnapshotCountCache} from './snapshot-count-cache';
const countCaches=new WeakMap<Sql,SnapshotCountCache>();
import {randomUUID} from 'node:crypto';
import type {Sql} from 'postgres';
import {readFactsV2} from './fact-v2-repository';

// Shared by snapshot construction and revocation filtering; publication alone is insufficient.
const eligible=`f.status='live' AND f.corpus_eligible AND f.canonical_claim_key IS NOT NULL
 AND c.enabled AND s.enabled AND (f.valid_until IS NULL OR f.valid_until>now())
 AND EXISTS (SELECT 1 FROM fact_texts t WHERE t.fact_id=f.id AND t.language=f.original_language AND t.review_state='accepted')`;
export async function buildFeedSnapshot(sql:Sql,options:{seed:string;batchSize:number}) {
 if(!options.seed||!Number.isInteger(options.batchSize)||options.batchSize<1||options.batchSize>1000)throw Error('Invalid snapshot options');
 const snapshotId=randomUUID();
 return sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(727461923)`;
  await tx`INSERT INTO feed_snapshots(id,total_eligible) VALUES(${snapshotId},0)`;
  // One INSERT SELECT keeps construction inside PostgreSQL, without loading the corpus in JS.
  await tx.unsafe(`INSERT INTO feed_entries(snapshot_id,position,fact_id)
   SELECT $1::uuid,(row_number() OVER(ORDER BY category_rank,category_id,id))::integer,id FROM (
    SELECT f.id,f.category_id,row_number() OVER(PARTITION BY f.category_id ORDER BY md5(f.id::text || $2),f.id) AS category_rank
    FROM facts f JOIN categories c ON c.id=f.category_id JOIN sources s ON s.id=f.source_id WHERE ${eligible}
   ) ranked`,[snapshotId,options.seed]);
  const count=(await tx`SELECT count(*)::integer AS count FROM feed_entries WHERE snapshot_id=${snapshotId}`)[0]!.count;
  await tx`UPDATE feed_snapshots SET active=false WHERE active`;
  await tx`UPDATE feed_snapshots SET active=true,total_eligible=${count} WHERE id=${snapshotId}`;
  return {snapshotId,totalEligible:count as number};
 });
}
export async function readSnapshotWindow(sql:Sql,snapshotId:string|undefined,position:number) {
 if(!Number.isSafeInteger(position)||position<0)throw Error('INVALID_CURSOR');
 let countCache=countCaches.get(sql);
 if(!countCache){countCache=new SnapshotCountCache();countCaches.set(sql,countCache);}
 const cache=countCache;
 return sql.begin('isolation level repeatable read read only',async tx=>{
  const snapshots=snapshotId
   ?await tx`SELECT id,total_eligible FROM feed_snapshots WHERE id=${snapshotId}::uuid`
   :await tx`SELECT id,total_eligible FROM feed_snapshots WHERE active`;
  const snapshot=snapshots[0];
  if(!snapshot)throw Error('REFRESH_REQUIRED');
  if(position>snapshot.total_eligible)throw Error('INVALID_CURSOR');
  const entries=await tx`SELECT position,fact_id FROM feed_entries WHERE snapshot_id=${snapshot.id} AND position>${position} ORDER BY position LIMIT 50`;
  const ids=entries.map(e=>e.fact_id);
  const visible=ids.length?await tx.unsafe(`SELECT f.id FROM facts f JOIN categories c ON c.id=f.category_id JOIN sources s ON s.id=f.source_id WHERE f.id=ANY($1::uuid[]) AND ${eligible}`,[ids]):[];
  const allowed=new Set(visible.map(r=>r.id));
  const fetched=await readFactsV2(tx as unknown as Sql,ids.filter(id=>allowed.has(id)));
  const byId=new Map(fetched.map(f=>[f.id,f]));
  const facts=entries.flatMap(e=>byId.has(e.fact_id)?[byId.get(e.fact_id)!]:[]);
  const readCount=async()=>{
   const counts=await tx.unsafe(`SELECT count(*)::integer AS count FROM feed_entries e JOIN facts f ON f.id=e.fact_id JOIN categories c ON c.id=f.category_id JOIN sources s ON s.id=f.source_id WHERE e.snapshot_id=$1::uuid AND ${eligible}`,[snapshot.id]);
   return counts[0]!.count as number;
  };
  let counted=await cache.get(snapshot.id,readCount);
  if(counted.count<facts.length)counted=await cache.get(snapshot.id,readCount,true);
  const last=entries.at(-1)?.position??position;
  return {snapshotId:snapshot.id as string,facts,position:last as number,hasMore:last<snapshot.total_eligible,totalEligible:counted.count,totalEligibleAsOf:new Date(counted.asOf).toISOString()};
 });
}
