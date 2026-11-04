import type {Sql} from 'postgres';
import type {CandidatePage, CandidateConnector} from '@sachmuch/connectors';
import {RateLimited} from '@sachmuch/connectors';
import {parseFactV2,isWebUrl} from '@sachmuch/core';
import {canonicalClaimKey} from './gate/claim-key';
import {persistCandidateInTransaction} from './persist-v2';
import {assessCandidate} from './gate/editorial';
export type BatchOptions={batchId:string;sourceId:string;maxRecords:number;maxDurationMs:number;dryRun:boolean};
export type BatchPage=CandidatePage;
export type BatchConnector=CandidateConnector;
export type BatchReport={candidates:number;accepted:number;duplicates:number;rejected:number;deferred:number;reviewPending:number;lastCursor:string|null;durationMs:number;requests:number;bytes:number;complete:boolean};
export async function runImportBatch(options:BatchOptions,deps:{sql:Sql;connector:BatchConnector;now?:()=>number}):Promise<BatchReport>{
 const {batchId,sourceId,maxRecords,maxDurationMs,dryRun}=options;
 if(!/^[a-zA-Z0-9_-]{1,96}$/.test(batchId)||deps.connector.id!==sourceId||!Number.isInteger(maxRecords)||maxRecords<1||maxRecords>1000||!Number.isInteger(maxDurationMs)||maxDurationMs<1||maxDurationMs>600_000) throw Error('Batch limits or identity invalid');
 const now=deps.now??Date.now,start=now(),deadline=start+maxDurationMs;
 const report:BatchReport={candidates:0,accepted:0,duplicates:0,rejected:0,deferred:0,reviewPending:0,lastCursor:null,durationMs:0,requests:0,bytes:0,complete:false};
 const db=await deps.sql.reserve();
 let locked=false;
 try {
  const lock=await db`SELECT pg_try_advisory_lock(hashtextextended(${batchId},0)) AS locked`;
  locked=lock[0]!.locked;
  if(!locked) throw Error('Batch already running');
  if(!dryRun) await db`INSERT INTO corpus_batches(id,source_id) VALUES(${batchId},${sourceId}) ON CONFLICT(id) DO NOTHING`;
  const stored=(await db`SELECT * FROM corpus_batches WHERE id=${batchId}`)[0];
  if(stored&&stored.source_id!==sourceId) throw Error('Batch source changed');
  let cursor:string|null=stored?.cursor??null;
  let page:BatchPage|null=(typeof stored?.pending_page==='string'?JSON.parse(stored.pending_page):stored?.pending_page)??null;
  let index:number=stored?.processing_index??0;
  let version:string|null=stored?.source_version??null;
  let complete:boolean=stored?.complete??false;
  report.lastCursor=cursor;
  const seen=new Set<string>();
  if(stored?.retry_after&&new Date(stored.retry_after).getTime()>now()) {report.deferred=1;return report;}
  while(!complete&&report.candidates<maxRecords&&now()<deadline){
   if(!page){
    try {
     page=await deps.connector.fetch(cursor,Math.min(100,maxRecords-report.candidates),AbortSignal.timeout(Math.max(1,deadline-now())));
     if(!Array.isArray(page.candidates)||page.candidates.length>100||!page.sourceVersion?.trim()||!Number.isSafeInteger(page.requests)||page.requests<0||!Number.isSafeInteger(page.bytes)||page.bytes<0||!(page.nextCursor===null||typeof page.nextCursor==='string'&&page.nextCursor.length>0&&page.nextCursor.length<=512)||page.nextCursor!==null&&page.nextCursor===cursor) throw Error('Invalid acquisition page');
     if(version&&version!==page.sourceVersion) throw Error('Source version changed; start a new batch');
     version=page.sourceVersion;index=0;
     report.requests+=page.requests;report.bytes+=page.bytes;
     if(!dryRun) await db`UPDATE corpus_batches SET pending_page=${JSON.stringify(page)}::jsonb,processing_index=0,source_version=${version},retry_after=NULL,updated_at=now() WHERE id=${batchId}`;
    } catch(error){
     if(error instanceof RateLimited){
      report.deferred++;
      if(!dryRun) await db`UPDATE corpus_batches SET retry_after=${new Date(now()+Math.max(1,error.retryAfterMs)).toISOString()} WHERE id=${batchId}`;
      break;
     }
     throw error;
    }
   }
   if(now()>=deadline) break;
   if(index===page.candidates.length){
    cursor=page.nextCursor;complete=cursor===null;page=null;index=0;
    if(!dryRun) await db`UPDATE corpus_batches SET cursor=${cursor},complete=${complete},pending_page=NULL,processing_index=0,updated_at=now() WHERE id=${batchId}`;
    report.lastCursor=cursor;
    continue;
   }
   const candidate=page.candidates[index]!;
   let key:string|null=null;
   try {
    parseFactV2(candidate.fact);
    key=canonicalClaimKey(candidate.claim);
    if(assessCandidate(candidate,new Date(now())).decision==='reject') key=null;
    if(candidate.batchId!==batchId||candidate.sourceVersion!==version||!candidate.evidence.length||candidate.evidence.some(e=>!isWebUrl(e.url)||!e.publisher.trim()||!e.sourceRecordKey.trim()||!Number.isFinite(Date.parse(e.checkedAt)))) key=null;
   } catch {key=null;}
   let outcome:'rejected'|'duplicates'|'reviewPending'='rejected';
   if(dryRun){
    if(key){
     const exists=seen.has(key)||(await db`SELECT id FROM facts WHERE canonical_claim_key=${key}`).length>0;
     outcome=exists?'duplicates':'reviewPending';seen.add(key);
    }
   } else {
    await db`BEGIN`;
    try {
     const result=key?await persistCandidateInTransaction(db,candidate,sourceId):null;
     await db`UPDATE corpus_batches SET processing_index=${index+1},updated_at=now() WHERE id=${batchId}`;
     await db`COMMIT`;
     outcome=result?result.inserted?'reviewPending':'duplicates':'rejected';
    } catch(error){await db`ROLLBACK`;throw error;}
   }
   report[outcome]++;report.candidates++;index++;
  }
  // Finishing the last item is also a valid page checkpoint when the record cap was reached.
  if(page&&index===page.candidates.length){
   cursor=page.nextCursor;complete=cursor===null;
   if(!dryRun) await db`UPDATE corpus_batches SET cursor=${cursor},complete=${complete},pending_page=NULL,processing_index=0,updated_at=now() WHERE id=${batchId}`;
  }
  report.lastCursor=cursor;report.complete=complete;
  return report;
 } finally {
  report.durationMs=Math.max(0,now()-start);
  try {if(locked) await db`SELECT pg_advisory_unlock(hashtextextended(${batchId},0))`;}
  finally {await db.release();}
 }
}
