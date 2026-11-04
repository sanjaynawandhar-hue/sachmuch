import {readFile} from 'node:fs/promises';
import {createDb} from '@sachmuch/db';
import {createManifestConnector} from '@sachmuch/connectors';
import {runImportBatch} from './batches';
import {assessCandidate} from './gate/editorial';
const [path,checksum,batchId,sourceId,mode='dry-run']=process.argv.slice(2);
if(!path||!checksum||!batchId||!sourceId||!['dry-run','import'].includes(mode)) throw Error('Usage: import-manifest <path> <sha256> <batch-id> <source-id> [dry-run|import]');
const contents=await readFile(path,'utf8');
const connector=createManifestConnector({sourceId,batchId,contents,sha256:checksum});
const reasons:Record<string,number>={};
const assessed=JSON.parse(contents).candidates.map((candidate:any)=>assessCandidate({...candidate,batchId,sourceVersion:checksum},new Date()));
for(const result of assessed) for(const reason of result.reasons) reasons[reason]=(reasons[reason]??0)+1;
const {sql}=createDb();
try {
 const report=await runImportBatch({batchId,sourceId,maxRecords:1000,maxDurationMs:600_000,dryRun:mode==='dry-run'},{sql,connector});
 console.log(JSON.stringify({mode,batchId,sourceId,report,reviewReasons:reasons},null,2));
} finally {await sql.end();}
