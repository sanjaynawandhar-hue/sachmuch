import type {FactV2,MobileFact} from '@sachmuch/core';
export type CanonicalClaim = {
 subject:string; predicate:string;
 object:{kind:'entity'|'text'|'quantity'|'date';value:string;unit?:string};
 qualifiers:Record<string,string>; timeScope?:string;
};
export type Evidence = {url:string;publisher:string;sourceRecordKey:string;checkedAt:string;licence:MobileFact['licence'];reference?:string};
export type CandidateV2 = {claim:CanonicalClaim;fact:FactV2;evidence:Evidence[];sourceVersion:string;batchId:string};
