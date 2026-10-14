import { it, expect } from "vitest";
import { createFeedResponse } from "../lib/feed-response";
it("returns a bounded versioned feed with no-store caching", async () => {
  let limit = 0;
  const r = await createFeedResponse(async (n) => {
    limit = n;
    return [];
  }, true);
  expect(limit).toBe(300);
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(await r.json()).toMatchObject({ version: 1, facts: [] });
});
it("does not read the database when unconfigured", async () => {
  let reads = 0;
  const r = await createFeedResponse(async () => {
    reads++;
    return [];
  }, false);
  expect(reads).toBe(0);
  expect(r.status).toBe(503);
});
it("does not expose database error details", async () => {
  const r = await createFeedResponse(async () => {
    throw Error("postgres://password@host");
  }, true);
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ error: { code: "FEED_UNAVAILABLE" } });
});
