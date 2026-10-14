import { createFeedResponse } from "../../../lib/feed-response";
export const dynamic = "force-dynamic";
export async function GET() {
  return createFeedResponse(async (limit) => {
    const { getFeedFacts } = await import("../../../lib/facts");
    return getFeedFacts(limit);
  }, Boolean(process.env.DATABASE_URL));
}
