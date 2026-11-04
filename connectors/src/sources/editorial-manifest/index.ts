import {createHash} from 'node:crypto';
import type {CandidateConnector} from '../../types';
import type {CandidateV2} from '@sachmuch/templates';
/** An integrity-checked transport, not publication approval. The importer validates each candidate. */
export function createManifestConnector(input:{sourceId:string;batchId:string;contents:string;sha256:string}):CandidateConnector {
 const version=createHash('sha256').update(input.contents).digest('hex');
 if(version!==input.sha256) throw Error('Manifest checksum mismatch');
 if(Buffer.byteLength(input.contents)>10_000_000) throw Error('Manifest exceeds pilot byte limit');
 const parsed=JSON.parse(input.contents);
 if(!Array.isArray(parsed.candidates)||parsed.candidates.length>1000) throw Error('Manifest must contain at most 1000 candidates');
 const rows:CandidateV2[]=parsed.candidates;
 if(rows.some(row=>!row||typeof row!=='object')) throw Error('Invalid manifest record');
 return {id:input.sourceId,async fetch(cursor,limit,signal){
  signal.throwIfAborted();
  if(!Number.isInteger(limit)||limit<1||limit>100) throw Error('Invalid manifest page limit');
  let offset=0;
  if(cursor!==null){
   const match=cursor.match(/^([a-f0-9]{64}):(0|[1-9][0-9]*)$/);
   if(!match||match[1]!==version) throw Error('Invalid manifest cursor');
   offset=Number(match[2]);
   if(!Number.isSafeInteger(offset)||offset>rows.length) throw Error('Invalid manifest cursor');
  }
  const candidates=rows.slice(offset,offset+limit).map(row=>({...row,batchId:input.batchId,sourceVersion:version}));
  const end=offset+candidates.length;
  return {candidates,nextCursor:end<rows.length?`${version}:${end}`:null,sourceVersion:version,requests:0,bytes:0};
 }};
}
