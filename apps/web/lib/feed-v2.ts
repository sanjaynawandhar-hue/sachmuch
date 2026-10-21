import {editorialFacts, parseFactV2, parseFeedV2, type FeedV2} from '@sachmuch/core';

/** Rollback edition, intentionally independent of database availability. */
export function curatedFeedV2(): FeedV2 {
 const facts = editorialFacts.map(({en,hi}) => parseFactV2({
  id:en.id, originalLanguage:'en', texts:{en:{hook:en.hook,body:en.body},...(hi?{hi:{hook:hi.hook,body:hi.body}}:{})},
  categoryId:en.categoryId, categorySlug:en.categorySlug, categoryLabel:en.categoryLabel, categoryEmoji:en.categoryEmoji,
  sourceUrl:en.sourceUrl, publisher:en.publisher, licence:en.licence,
  ...(en.attributionText?{attributionText:en.attributionText}:{}), knowledgeKind:'fact',
  ...(en.quality!==undefined?{quality:en.quality}:{}), ...(en.templateId?{templateId:en.templateId}:{})
 }));
 return parseFeedV2({version:2,fetchedAt:new Date().toISOString(),facts,nextCursor:null,snapshotId:'curated-2026-10-21-100',totalEligible:facts.length});
}
