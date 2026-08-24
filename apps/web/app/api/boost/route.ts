import { NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL ?? '', { max: 2, prepare: false });

/**
 * Records a boost.
 *
 * Deliberately not a share endpoint: nothing is posted anywhere. The count is
 * the whole point — it is the reader saying a fact deserves a wider audience,
 * and the feed ranks on it.
 *
 * There is no auth yet, so this is trivially inflatable. That is acceptable
 * while the signal only reorders one person's feed; before boosts influence
 * anything shared between users it needs the anonymous session binding from §3.
 */
export async function POST(request: Request) {
  let factId: unknown;
  try {
    ({ factId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (typeof factId !== 'string' || !/^[0-9a-f-]{36}$/.test(factId)) {
    return NextResponse.json({ error: 'factId must be a uuid' }, { status: 400 });
  }

  const rows = await sql<{ boost_count: number }[]>`
    UPDATE facts SET boost_count = boost_count + 1
     WHERE id = ${factId} AND status = 'live'
    RETURNING boost_count
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'no such live fact' }, { status: 404 });
  return NextResponse.json({ boostCount: rows[0]!.boost_count });
}
