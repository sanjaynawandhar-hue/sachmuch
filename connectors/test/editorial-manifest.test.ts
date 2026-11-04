import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {createManifestConnector} from '../src/sources/editorial-manifest';
const contents=JSON.stringify({candidates:[{claim:{subject:'test:one'},fact:{id:'one'},evidence:[{reference:'fixture'}]},{claim:{subject:'test:two'},fact:{id:'two'},evidence:[{reference:'fixture'}]}]});
const sha256=createHash('sha256').update(contents).digest('hex');
it('rejects a manifest whose bytes changed before mapping any record',()=>{
 expect(()=>createManifestConnector({sourceId:'test',batchId:'test',contents:contents+' ',sha256})).toThrow('checksum');
});
it('pages a versioned local manifest with stable source provenance',async()=>{
 const c=createManifestConnector({sourceId:'test',batchId:'test',contents,sha256});
 const first=await c.fetch(null,1,new AbortController().signal);
 expect(first.candidates).toHaveLength(1);
 expect(first.candidates[0]?.batchId).toBe('test');
 const last=await c.fetch(first.nextCursor,1,new AbortController().signal);
 expect(last.candidates[0]?.fact.id).toBe('two');
 expect(last.nextCursor).toBeNull();
 expect(last.sourceVersion).toBe(sha256);
 await expect(c.fetch('bad',1,new AbortController().signal)).rejects.toThrow('cursor');
});
