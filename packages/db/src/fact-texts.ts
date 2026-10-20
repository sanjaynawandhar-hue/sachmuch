import type { Sql } from 'postgres';

/** Bounded keyset batches; a retry never overwrites reviewed or edited text. */
export async function backfillFactTexts(sql: Sql): Promise<{inserted:number;invalid:number}> {
  let after = '00000000-0000-0000-0000-000000000000';
  let inserted = 0;
  let invalid = 0;
  while (true) {
    const result = await sql.begin(async tx => {
      const rows = await tx<{id:string;hook_en:string|null;body_en:string|null;hook_hi:string|null;body_hi:string|null;status:string}[]>`
        SELECT id,hook_en,body_en,hook_hi,body_hi,status FROM facts
        WHERE id > ${after}::uuid ORDER BY id LIMIT 500`;
      let added = 0, bad = 0;
      for (const row of rows) {
        for (const language of ['en','hi'] as const) {
          const hook = row[`hook_${language}`], body = row[`body_${language}`];
          if (!hook?.trim() || !body?.trim()) {
            if (hook !== null || body !== null) bad++;
            continue;
          }
          const saved = await tx`INSERT INTO fact_texts(fact_id,language,hook,body,review_state)
            VALUES (${row.id},${language},${hook},${body},${row.status === 'live' ? 'accepted' : 'pending'})
            ON CONFLICT(fact_id,language) DO NOTHING RETURNING fact_id`;
          added += saved.length;
        }
      }
      return {added,bad,last:rows.at(-1)?.id};
    });
    inserted += result.added;
    invalid += result.bad;
    if (!result.last) return {inserted,invalid};
    after = result.last;
  }
}
