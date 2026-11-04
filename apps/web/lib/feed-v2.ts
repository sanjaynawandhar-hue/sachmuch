import {decodeFeedCursor,encodeFeedCursor,FeedCursorError} from './feed-cursor';
import {editorialFacts, parseFactV2, parseFeedV2, type FeedV2} from '@sachmuch/core';

/** Rollback edition, intentionally independent of database availability. */
export function curatedFeedV2(after?:string,paged=true): FeedV2 {
 const facts = editorialFacts.map(({en,hi}) => parseFactV2({
  id:en.id, originalLanguage:'en', texts:{en:{hook:en.hook,body:en.body},...(hi?{hi:{hook:hi.hook,body:hi.body}}:{})},
  categoryId:en.categoryId, categorySlug:en.categorySlug, categoryLabel:en.categoryLabel, categoryEmoji:en.categoryEmoji,
  sourceUrl:en.sourceUrl, publisher:en.publisher, licence:en.licence,
  ...(en.attributionText?{attributionText:en.attributionText}:{}), knowledgeKind:'fact',
  ...(en.quality!==undefined?{quality:en.quality}:{}), ...(en.templateId?{templateId:en.templateId}:{})
 }));
 const snapshotId='curated-2026-10-21-100';
 const cursor=after===undefined?{snapshotId,position:0}:decodeFeedCursor(after);
 if(cursor.snapshotId!==snapshotId)throw new FeedCursorError('REFRESH_REQUIRED');
 if(cursor.position>facts.length)throw new FeedCursorError('INVALID_CURSOR');
 const end=Math.min(cursor.position+(paged?50:facts.length),facts.length);
 return parseFeedV2({version:2,fetchedAt:new Date().toISOString(),facts:facts.slice(cursor.position,end),nextCursor:end<facts.length?encodeFeedCursor({snapshotId,position:end}):null,snapshotId,totalEligible:facts.length});
}
