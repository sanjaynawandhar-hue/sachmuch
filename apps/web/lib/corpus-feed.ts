import type {Sql} from 'postgres';
import {parseFeedV2,type FeedV2} from '@sachmuch/core';
import {readSnapshotWindow} from '@sachmuch/db';
import {decodeFeedCursor,encodeFeedCursor,FeedCursorError} from './feed-cursor';
export async function readSnapshotPage(sql:Sql,after?:string):Promise<FeedV2>{
 const cursor=after===undefined?undefined:decodeFeedCursor(after);
 if(cursor&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.snapshotId))throw new FeedCursorError('REFRESH_REQUIRED');
 try{
  const page=await readSnapshotWindow(sql,cursor?.snapshotId,cursor?.position??0);
  return parseFeedV2({version:2,fetchedAt:new Date().toISOString(),facts:page.facts,snapshotId:page.snapshotId,totalEligible:page.totalEligible,
   nextCursor:page.hasMore?encodeFeedCursor({snapshotId:page.snapshotId,position:page.position}):null});
 }catch(error){
  if(error instanceof Error&&(error.message==='INVALID_CURSOR'||error.message==='REFRESH_REQUIRED'))throw new FeedCursorError(error.message);
  throw error;
 }
}
