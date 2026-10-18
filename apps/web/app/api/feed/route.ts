import { createFeedResponse } from "../../../lib/feed-response";
export const dynamic = "force-dynamic";
export async function GET(request?: Request) {
  const url = request ? new URL(request.url) : null;
  if (url?.searchParams.get("paged") === "1") {
    const after = url.searchParams.get("after") ?? undefined;
    if (after && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after))
      return Response.json({error: {code: "INVALID_CURSOR"}}, {status: 400});
    if (url?.searchParams.get("edition") === "fun") {
      const {editorialFacts, parseFeedEnvelope} = await import("@sachmuch/core");
      const rows=editorialFacts.filter(f=>!after || f.en.id>after.toLowerCase()).sort((a,b)=>a.en.id.localeCompare(b.en.id));
      const facts=rows.slice(0,100);
      return Response.json(parseFeedEnvelope({version:1,fetchedAt:new Date().toISOString(),facts,nextCursor:rows.length>100?facts.at(-1)!.en.id:null}),{headers:{"Cache-Control":"no-store"}});
    }
    try {
      const { getFeedFacts } = await import("../../../lib/facts");
      const { parseFeedEnvelope } = await import("@sachmuch/core");
      const rows = await getFeedFacts(101, {after});
      const facts = rows.slice(0, 100);
      return Response.json(parseFeedEnvelope({version: 1, fetchedAt: new Date().toISOString(), facts, nextCursor: rows.length > 100 ? facts.at(-1)!.en.id : null}), {headers: {"Cache-Control": "no-store"}});
    } catch {
      return Response.json({error: {code: "FEED_UNAVAILABLE"}}, {status: 503});
    }
  }
  return createFeedResponse(async (limit) => {
    const { getFeedFacts } = await import("../../../lib/facts");
    return getFeedFacts(limit);
  }, Boolean(process.env.DATABASE_URL));
}
