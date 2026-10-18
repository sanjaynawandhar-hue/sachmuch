import { beforeEach, it, expect, vi } from "vitest";
import { fact } from "../../mobile/src/test/fixtures";
const read = vi.hoisted(() => vi.fn());
vi.mock("../lib/facts", () => ({ getFeedFacts: read }));
import { GET } from "../app/api/feed/route";
beforeEach(() => { read.mockReset(); });
it("returns 100 records and a cursor only when another record exists", async () => {
  const rows = Array.from({length: 101}, (_, n) => ({en: {...fact.en, id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`}}));
  read.mockResolvedValue(rows);
  const response = await GET(new Request("https://example.org/api/feed?paged=1"));
  const page = await response.json();
  expect(response.status).toBe(200);
  expect(page.facts).toHaveLength(100);
  expect(page.nextCursor).toBe(rows[99]!.en.id);
  expect(read).toHaveBeenCalledWith(101, {after: undefined});
  read.mockResolvedValue([rows[100]]);
  const last = await GET(new Request(`https://example.org/api/feed?paged=1&after=${page.nextCursor}`));
  expect((await last.json()).nextCursor).toBeNull();
  expect(read).toHaveBeenLastCalledWith(101, {after: page.nextCursor});
});
it("rejects malformed cursors without reading the database", async () => {
  expect((await GET(new Request("https://example.org/api/feed?paged=1&after=bad"))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});
it("redacts database failures", async () => {
  read.mockRejectedValue(Error("secret"));
  const response = await GET(new Request("https://example.org/api/feed?paged=1"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error: {code: "FEED_UNAVAILABLE"}});
});
it('serves the short fun edition without database statistics or a database dependency', async()=>{
 read.mockRejectedValue(Error('database unavailable'));
 const response=await GET(new Request('https://example.org/api/feed?paged=1&edition=fun'));
 const page=await response.json();
 expect(response.status).toBe(200);
 expect(page.facts.length).toBeGreaterThanOrEqual(20);
 expect(page.facts.every((f:any)=>f.en.templateId.startsWith('editorial-') && f.hi && f.en.body.length<350)).toBe(true);
 expect(read).not.toHaveBeenCalled();
 const last=await GET(new Request(`https://example.org/api/feed?paged=1&edition=fun&after=${page.facts.at(-1).en.id}`));
 expect((await last.json()).facts).toHaveLength(0);
});
