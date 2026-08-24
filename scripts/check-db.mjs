/**
 * Confirms DATABASE_URL actually connects, before anything tries to migrate.
 *
 * Run: node --env-file=.env scripts/check-db.mjs
 *
 * Checks the three things that go wrong in practice, in order: the password
 * placeholder left unreplaced, the wrong connection mode, and the extensions
 * our migrations depend on.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (url.includes('[YOUR-PASSWORD]') || url.includes('YOUR-PASSWORD')) {
  console.error('The password placeholder is still in the URL. Replace [YOUR-PASSWORD],');
  console.error('brackets included, with the database password you set when creating the project.');
  process.exit(1);
}
if (url.includes(':6543')) {
  console.error('That is the TRANSACTION pooler (port 6543). It cannot run our migrations.');
  console.error('Use the Session pooler instead — same host, port 5432.');
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });

try {
  const [{ version }] = await sql`SELECT version()`;
  console.log('connected:', version.split(',')[0]);

  const ext = await sql`
    SELECT name, (installed_version IS NOT NULL) AS installed
      FROM pg_available_extensions
     WHERE name IN ('pg_trgm', 'btree_gin')
  `;
  for (const e of ext) {
    console.log(`${e.name}: ${e.installed ? 'installed' : 'available, will be created by migration 0001'}`);
  }

  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'
  `;
  console.log(`public schema holds ${count} tables`);
  console.log(count === 0 ? '\nready — run the migrations next.' : '\nalready migrated.');
} catch (err) {
  console.error('\ncould not connect:', err.message);
  if (/ENETUNREACH|ENOTFOUND/.test(err.message)) {
    console.error('That usually means the DIRECT connection was copied, which is IPv6-only.');
    console.error('Go back to Connect and choose the Session pooler.');
  }
  if (/Tenant or user not found/i.test(err.message)) {
    console.error('The username looks wrong. A pooler URL needs the full "postgres.<project-ref>"');
    console.error('form, not a bare "postgres" — recopy it rather than editing by hand.');
  }
  if (/password authentication failed/i.test(err.message)) {
    console.error('The password in the URL is wrong. Reset it under Settings -> Database.');
  }
  process.exit(1);
} finally {
  await sql.end();
}
