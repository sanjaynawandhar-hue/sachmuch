import type {Sql,TransactionSql} from 'postgres';
import type {CandidateV2} from '@sachmuch/templates';
import {parseFactV2,isWebUrl} from '@sachmuch/core';
import {canonicalClaimKey} from './gate/claim-key';

/** Acquisition writes drafts. Review/publication is a separate operation. */
export async function persistCandidateV2(sql:Sql,candidate:CandidateV2,sourceId:string):Promise<{id:string;inserted:boolean}> {
 return sql.begin(tx=>persistCandidateInTransaction(tx,candidate,sourceId));
}

export async function persistCandidateInTransaction(tx:TransactionSql|Sql,candidate:CandidateV2,sourceId:string):Promise<{id:string;inserted:boolean}> {
 const fact=parseFactV2(candidate.fact);
 const key=canonicalClaimKey(candidate.claim);
 if(!candidate.batchId.trim()||!candidate.sourceVersion.trim()||!candidate.evidence.length) throw Error('Candidate provenance missing');
 for(const e of candidate.evidence){
  if(!isWebUrl(e.url)||!e.publisher.trim()||!e.sourceRecordKey.trim()||!Number.isFinite(Date.parse(e.checkedAt))) throw Error('Invalid evidence');
 }

  const added=await tx`INSERT INTO facts(id,category_id,source_id,hook_en,body_en,hook_hi,body_hi,hi_missing,
   source_url,publisher,licence,attribution_text,status,normalized_hash,canonical_claim_key,canonical_claim,
   original_language,knowledge_kind,as_of,valid_until,batch_id)
   VALUES(${fact.id},${fact.categoryId},${sourceId},${fact.texts.en?.hook??null},${fact.texts.en?.body??null},
   ${fact.texts.hi?.hook??null},${fact.texts.hi?.body??null},${!fact.texts.hi},${fact.sourceUrl},${fact.publisher},
   ${fact.licence},${fact.attributionText??null},'draft',${key},${key},${JSON.stringify(candidate.claim)}::jsonb,
   ${fact.originalLanguage},${fact.knowledgeKind},${fact.asOf??null},${fact.validUntil??null},${candidate.batchId})
   ON CONFLICT(canonical_claim_key) DO NOTHING RETURNING id`;
  const inserted=added.length>0;
  const id:string=inserted?added[0]!.id:(await tx`SELECT id FROM facts WHERE canonical_claim_key=${key}`)[0]!.id;
  if(inserted){
   for(const language of ['en','hi'] as const){
    const text=fact.texts[language];
    if(text) await tx`INSERT INTO fact_texts(fact_id,language,hook,body,review_state) VALUES(${id},${language},${text.hook},${text.body},'pending') ON CONFLICT(fact_id,language) DO NOTHING`;
   }
  }
  for(const e of candidate.evidence){
   await tx`INSERT INTO fact_evidence(fact_id,source_url,publisher,licence,checked_at,source_record_key,reference)
    VALUES(${id},${e.url},${e.publisher},${e.licence},${e.checkedAt},${e.sourceRecordKey},${e.reference??null})
    ON CONFLICT(fact_id,source_url,source_record_key) DO NOTHING`;
  }
  return {id,inserted};

}
