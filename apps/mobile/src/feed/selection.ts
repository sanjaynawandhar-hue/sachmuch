import { isDiscoveryFact, selectFactText, upgradeLegacyFact } from '@sachmuch/core';
import type { BilingualMobileFact, MobileFact, FactV2, Language } from '@sachmuch/core';
export type DisplayFact = MobileFact & {displayLanguage:Language;knowledgeKind:FactV2['knowledgeKind']};
export function asFactV2(fact:FactV2|BilingualMobileFact):FactV2 {
 return 'texts' in fact ? fact : upgradeLegacyFact(fact);
}
export function toDisplayFact(fact:FactV2,preferred:Language):DisplayFact {
 const {language,text}=selectFactText(fact,preferred);
 return {id:fact.id,categoryId:fact.categoryId,categorySlug:fact.categorySlug,categoryLabel:fact.categoryLabel,
  categoryEmoji:fact.categoryEmoji,...text,sourceUrl:fact.sourceUrl,publisher:fact.publisher,licence:fact.licence,
  ...(fact.attributionText?{attributionText:fact.attributionText}:{}),
  ...(fact.templateId?{templateId:fact.templateId}:{}),...(fact.quality!==undefined?{quality:fact.quality}:{}),
  corroborationCount:1,difficulty:3,entities:[],displayLanguage:language,knowledgeKind:fact.knowledgeKind};
}
export function selectLanguageFacts(facts:(FactV2|BilingualMobileFact)[],language:Language):DisplayFact[] {
 return facts.map(asFactV2).map(f=>toDisplayFact(f,language)).filter(isDiscoveryFact);
}
export function resolveCurrentId(facts:MobileFact[],previousId:string|null):string|null {
 return facts.some(f=>f.id===previousId)?previousId:(facts[0]?.id??null);
}
