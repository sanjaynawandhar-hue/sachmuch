import {createDb} from '@sachmuch/db';
import {migrateCorpus} from '../../packages/db/src/corpus-migrations';
const {sql}=createDb();
try {console.log(JSON.stringify(await migrateCorpus(sql)));}
catch(error){console.error(JSON.stringify({error:'CORPUS_MIGRATION_FAILED',code:(error as {code?:string}).code??'validation'}));process.exitCode=1;}
finally{await sql.end();}
