/**
 * Applies the hand-written SQL migrations that drizzle-kit does not generate:
 * extensions, generated search vectors, triggers and functions.
 *
 * drizzle-kit push handles tables, constraints and indexes. Everything in
 * 0001 is deliberately in the database rather than in application code, because
 * the pipeline runs unattended on a cron and application code is exactly what
 * gets bypassed then.
 *
 * Run: node --env-file=.env scripts/apply-sql.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const DIR = 'packages/db/migrations';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

// 0000 is the generated one, already applied by drizzle-kit push.
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql') && !f.startsWith('0000')).sort();

try {
  for (const file of files) {
    process.stdout.write(`${file} ... `);
    await sql.unsafe(readFileSync(join(DIR, file), 'utf8'));
    console.log('ok');
  }

  const [{ exts }] = await sql`
    SELECT array_agg(extname ORDER BY extname) AS exts
      FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gin')
  `;
  const trg = await sql`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname`;
  const fns = await sql`
    SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND proname LIKE '%sweep%' OR proname LIKE '%refresh%'
     ORDER BY proname
  `;
  console.log(`\nextensions: ${exts?.join(', ') ?? 'none'}`);
  console.log(`triggers:   ${trg.map((t) => t.tgname).join(', ')}`);
  console.log(`functions:  ${[...new Set(fns.map((f) => f.proname))].join(', ')}`);
} catch (err) {
  console.error('\nfailed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
