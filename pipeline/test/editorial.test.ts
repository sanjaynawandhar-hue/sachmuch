import {it,expect} from 'vitest';
import type {CandidateV2} from '@sachmuch/templates';
import {assessCandidate} from '../src/gate/editorial';
const now=new Date('2026-10-22T00:00:00Z');
const base:CandidateV2={claim:{subject:'test:animal',predicate:'has',object:{kind:'text',value:'adaptation'},qualifiers:{}},fact:{id:'00000000-0000-4000-8000-000000000001',originalLanguage:'en',texts:{en:{hook:'A fixture about an animal',body:'This test fixture contains a complete short explanation for checking publication rules without inventing a live fact.'}},categoryId:14,categorySlug:'animals-wildlife',categoryLabel:'Animals',categoryEmoji:'🐙',sourceUrl:'https://example.org/animal',publisher:'Fixture',licence:'cc0',knowledgeKind:'fact'},evidence:[{url:'https://example.org/animal',publisher:'Fixture',sourceRecordKey:'animal',checkedAt:'2026-10-21T00:00:00Z',licence:'cc0',reference:'Explicit fixture statement supporting this claim.'}],sourceVersion:'test-1',batchId:'test'};
it('allows either supported original language but never equates formatting with factual approval',()=>{
 expect(assessCandidate(base,now)).toEqual({decision:'review',reasons:['editorial.approval_required']});
 const hi={...base,fact:{...base.fact,originalLanguage:'hi' as const,texts:{hi:{hook:'यह एक पूरा परीक्षण तथ्य है',body:'यह एक परीक्षण के लिए लिखा गया पूरा छोटा तथ्य है और इसे वास्तविक ऐप में प्रकाशित नहीं करना है।'}}}};
 expect(assessCandidate(hi,now).decision).toBe('review');
 expect(assessCandidate({...base,fact:{...base.fact,texts:{}}},now).decision).toBe('reject');
});
it('rejects movie content and unresolved placeholders',()=>{
 expect(assessCandidate({...base,fact:{...base.fact,categorySlug:'bollywood'}},now).decision).toBe('reject');
 expect(assessCandidate({...base,fact:{...base.fact,texts:{en:{hook:'An unresolved Q123 entity',body:base.fact.texts.en!.body}}}},now).decision).toBe('reject');
});
it('requires supporting evidence instead of treating a working URL as proof',()=>{
 expect(assessCandidate({...base,evidence:[{...base.evidence[0]!,reference:undefined}]},now).reasons).toContain('evidence.support_missing');
});
it('holds oversized or expired cards and undated changing claims for review',()=>{
 expect(assessCandidate({...base,fact:{...base.fact,texts:{en:{hook:'A long explanation for review',body:'A long wordy explanation. '.repeat(15)}}}},now).reasons).toContain('text.fit');
 expect(assessCandidate({...base,fact:{...base.fact,validUntil:'2026-01-01'}},now).reasons).toContain('claim.expired');
 expect(assessCandidate({...base,fact:{...base.fact,categorySlug:'politics'}},now).reasons).toContain('claim.time_policy_missing');
});
it('requires religious and horror material to be explicitly classified for review',()=>{
 expect(assessCandidate({...base,fact:{...base.fact,categorySlug:'horror',knowledgeKind:'fact'}},now).reasons).toContain('knowledge.classification_review');
});
