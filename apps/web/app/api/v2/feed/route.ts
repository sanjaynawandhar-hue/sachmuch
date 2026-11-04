import {createDb} from '@sachmuch/db';
import {readSnapshotPage} from '../../../../lib/corpus-feed';
let client:ReturnType<typeof createDb>|undefined;
import {curatedFeedV2} from '../../../../lib/feed-v2';
import {FeedCursorError} from '../../../../lib/feed-cursor';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
 const params=new URL(request.url).searchParams;
 const after=params.get('after')??undefined;
 try { return Response.json(process.env.SACHMUCH_FEED_EDITION==='corpus'?await readSnapshotPage((client??=createDb()).sql,after):curatedFeedV2(after,params.get('paged')==='1'||after!==undefined),{headers:{'Cache-Control':'no-store'}}); }
 catch(error) {
  if(error instanceof FeedCursorError)return Response.json({error:{code:error.code}},{status:error.code==='REFRESH_REQUIRED'?409:400,headers:{'Cache-Control':'no-store'}});
  return Response.json({error:{code:'FEED_UNAVAILABLE'}},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
