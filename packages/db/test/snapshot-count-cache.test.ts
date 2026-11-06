import {it,expect} from 'vitest';
import {SnapshotCountCache} from '../src/snapshot-count-cache';
it('reuses counts within their freshness window and refreshes expired or explicitly invalidated counts',async()=>{
 let now=0,calls=0,value=100000;
 const cache=new SnapshotCountCache(()=>now);
 const read=async()=>{calls++;return value;};
 expect(await cache.get('one',read)).toEqual({count:100000,asOf:0});
 for(let n=0;n<2000;n++)await cache.get('one',read);
 expect(calls).toBe(1);
 value=99950;
 expect((await cache.get('one',read,true)).count).toBe(99950);
 now=30001;
 expect((await cache.get('one',read)).asOf).toBe(30001);
 expect(calls).toBe(3);
});
it('does not cache failed reads or retain unbounded snapshots',async()=>{
 const cache=new SnapshotCountCache(()=>0);
 await expect(cache.get('bad',async()=>{throw Error('offline');})).rejects.toThrow('offline');
 expect((await cache.get('bad',async()=>1)).count).toBe(1);
 for(let n=0;n<40;n++)await cache.get(String(n),async()=>n);
 let calls=0;await cache.get('0',async()=>{calls++;return 0;});
 expect(calls).toBe(1);
});
