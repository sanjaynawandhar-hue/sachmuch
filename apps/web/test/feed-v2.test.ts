import {it,expect} from 'vitest';
import {GET} from '../app/api/v2/feed/route';
import {GET as legacy} from '../app/api/feed/route';
import {parseFeedV2} from '@sachmuch/core';
it('serves the real curated count as v2 without changing legacy clients', async () => {
 const response = await GET(new Request('https://example.com/api/v2/feed'));
 const body = parseFeedV2(await response.json());
 expect(body.facts).toHaveLength(20);
 expect(body.totalEligible).toBe(20);
 expect(body.snapshotId).toBe('curated-v2');
 expect(body.nextCursor).toBeNull();
 expect(body.facts[0]?.texts.en?.body).toBeTruthy();
 const old = await legacy(new Request('https://example.com/api/feed?paged=1&edition=fun'));
 expect((await old.json()).version).toBe(1);
});
it('rejects a cursor instead of repeating the curated page indefinitely',async()=>{
 const response = await GET(new Request('https://example.com/api/v2/feed?after=bad'));
 expect(response.status).toBe(400);
});
