/** Counts are estimates as of a disclosed timestamp, at most 30s old per process.
 * Page eligibility is always checked in the database, regardless of this cache. */
export class SnapshotCountCache {
 private entries=new Map<string,{count:number;asOf:number}>();
 constructor(private now:()=>number=Date.now){}
 async get(id:string,read:()=>Promise<number>,force=false):Promise<{count:number;asOf:number}>{
  const cached=this.entries.get(id);
  if(!force&&cached&&this.now()-cached.asOf<30000)return cached;
  const asOf=this.now();
  const count=await read();
  if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid eligible count');
  const value={count,asOf};
  this.entries.delete(id);this.entries.set(id,value);
  if(this.entries.size>32)this.entries.delete(this.entries.keys().next().value!);
  return value;
 }
}
