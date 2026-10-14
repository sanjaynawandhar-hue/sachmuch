import { parseFeedEnvelope, type BilingualMobileFact } from "@sachmuch/core";
export async function createFeedResponse(
  read: (limit: number) => Promise<BilingualMobileFact[]>,
  configured: boolean,
): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!configured) throw new Error("Unavailable");
    const feed = parseFeedEnvelope({
      version: 1,
      fetchedAt: new Date().toISOString(),
      facts: await read(300),
    });
    return Response.json(feed, { headers });
  } catch {
    return Response.json(
      { error: { code: "FEED_UNAVAILABLE" } },
      { status: 503, headers },
    );
  }
}
