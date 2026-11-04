import {it,expect} from 'vitest';
import {GET} from '../app/api/v2/feed/route';
it('walks the curated collection in bounded pages without repeats',async()=>{
 const first=await (await GET(new Request('https://example.org/api/v2/feed?paged=1'))).json();
 expect(first.facts).toHaveLength(50);
 expect(first.nextCursor).toBeTruthy();
 const second=await (await GET(new Request(`https://example.org/api/v2/feed?after=${first.nextCursor}`))).json();
 expect(second.facts).toHaveLength(50);
 expect(second.nextCursor).toBeNull();
 expect(new Set([...first.facts,...second.facts].map(f=>f.id)).size).toBe(100);
 expect(second.totalEligible).toBe(100);
});
it('distinguishes expired snapshots from malformed cursors',async()=>{
 const raw=Buffer.from(JSON.stringify({snapshotId:'curated-old',position:50})).toString('base64url');
 expect((await GET(new Request(`https://example.org/api/v2/feed?after=${raw}`))).status).toBe(409);
 for(const position of [-1,0.5,'50',Infinity]){
 const after=Buffer.from(JSON.stringify({snapshotId:'curated-old',position})).toString('base64url');
 expect((await GET(new Request(`https://example.org/api/v2/feed?after=${after}`))).status).toBe(400);
 }
});
it('keeps all curated cards in the initial response for installed clients without pagination opt-in',async()=>{
 const page=await (await GET(new Request('https://example.org/api/v2/feed'))).json();
 expect(page.facts).toHaveLength(100);
 expect(page.nextCursor).toBeNull();
});
