/** Read-only production inventory. Never print connection strings or raw errors. */
import {createDb} from '@sachmuch/db';
const {sql}=createDb();
try {
 const status=await sql`SELECT status,count(*)::integer AS count FROM facts GROUP BY status ORDER BY status`;
 const topics=await sql`SELECT c.slug,count(*)::integer AS count FROM facts f JOIN categories c ON c.id=f.category_id WHERE f.status='live' GROUP BY c.slug ORDER BY count DESC`;
 const columns=await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='facts' AND column_name IN ('canonical_claim_key','corpus_eligible','original_language','batch_id') ORDER BY column_name`;
 const tables=await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('feed_snapshots','feed_entries','corpus_batches','fact_texts','fact_evidence') ORDER BY table_name`;
 const registry=await sql`SELECT to_regclass('drizzle.__drizzle_migrations')::text AS table_name`;
 const history=registry[0]?.table_name?await sql`SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id`:[];
 console.log(JSON.stringify({history,checkedAt:new Date().toISOString(),status,topics,columns,tables},null,2));
} catch(error) {
 console.error(JSON.stringify({error:'DATABASE_DIAGNOSTIC_FAILED',code:(error as {code?:string}).code??'unknown'}));
 process.exitCode=1;
} finally {await sql.end();}
