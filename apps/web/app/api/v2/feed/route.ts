import {curatedFeedV2} from '../../../../lib/feed-v2';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
 if (new URL(request.url).searchParams.has('after')) return Response.json({error:{code:'INVALID_CURSOR'}},{status:400});
 try { return Response.json(curatedFeedV2(),{headers:{'Cache-Control':'no-store'}}); }
 catch { return Response.json({error:{code:'FEED_UNAVAILABLE'}},{status:503}); }
}
