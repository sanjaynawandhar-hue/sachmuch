import type {CandidateV2} from '@sachmuch/templates';
import {parseFactV2,isWebUrl,isDiscoveryFact} from '@sachmuch/core';
import {canonicalClaimKey} from './claim-key';
/** Structural checks are not factual approval; every eligible draft still needs review. */
export function assessCandidate(candidate:CandidateV2,now:Date):{decision:'publish'|'review'|'reject';reasons:string[]} {
 const reasons:string[]=[];
 try {parseFactV2(candidate.fact);canonicalClaimKey(candidate.claim);}
 catch {return {decision:'reject',reasons:['candidate.invalid']};}
 const f=candidate.fact;
 if(!isDiscoveryFact(f)||/\b(bollywood|hollywood)\b/i.test(Object.values(f.texts).map(t=>t?.hook+' '+t?.body).join(' '))) return {decision:'reject',reasons:['topic.excluded']};
 for(const t of Object.values(f.texts)){
  if(!t)continue;
  if(/\b[QL]\d+\b|\{\{|\[TODO\]|\bundefined\b/.test(t.hook+' '+t.body)) return {decision:'reject',reasons:['text.placeholder']};
  const words=t.body.trim().split(/\s+/).length;
  if(t.body.length>220||words>40||words<15||t.hook.trim().split(/\s+/).length>12) reasons.push('text.fit');
 }
 if(!candidate.sourceVersion?.trim()||!candidate.batchId?.trim()) reasons.push('evidence.provenance_missing');
 if(!candidate.evidence?.length||candidate.evidence.some(e=>!isWebUrl(e.url)||!e.publisher?.trim()||!e.sourceRecordKey?.trim()||!e.reference?.trim()||!Number.isFinite(Date.parse(e.checkedAt))||Date.parse(e.checkedAt)>now.getTime())) reasons.push('evidence.support_missing');
 if(f.validUntil&&Date.parse(f.validUntil)<=now.getTime()) reasons.push('claim.expired');
 if(f.asOf&&Date.parse(f.asOf)>now.getTime()) reasons.push('claim.future');
 if(/politics|finance|money|artificial-intelligence|technology|records/.test(f.categorySlug)&&(!f.asOf||!f.validUntil)) reasons.push('claim.time_policy_missing');
 if(/religion|god|mythology|horror|folklore/.test(f.categorySlug)&&f.knowledgeKind==='fact') reasons.push('knowledge.classification_review');
 if((f.licence==='cc_by'||f.licence==='cc_by_sa')&&!f.attributionText?.trim()) reasons.push('licence.attribution_missing');
 if(f.licence==='terms_only') reasons.push('licence.reuse_review');
 return {decision:'review',reasons:[...new Set(reasons),'editorial.approval_required']};
}
