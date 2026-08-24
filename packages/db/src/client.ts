import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Point it at the Supabase Postgres connection string ' +
      '(Project settings -> Database -> Connection string -> URI).',
    );
  }
  return url;
}

/**
 * One connection for scripts and pipeline jobs. `max: 4` because the ingestion
 * runner is the only thing writing and Supabase's free tier pooler is small.
 */
export function createDb(url = connectionString()) {
  const sql = postgres(url, { max: 4, prepare: false });
  return { db: drizzle(sql, { schema }), sql };
}

export { schema };
