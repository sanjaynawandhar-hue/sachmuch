import { createDb } from '../src/client';
import { backfillFactTexts } from '../src/fact-texts';
const {sql} = createDb();
try { console.log(JSON.stringify(await backfillFactTexts(sql))); }
catch { console.error('Text backfill failed; inspect database connectivity and migration status.'); process.exitCode = 1; }
finally { await sql.end(); }
