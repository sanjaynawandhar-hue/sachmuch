import { it, expect, vi } from 'vitest';
const query = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('postgres', () => ({default: () => query}));
import { getFeedFacts } from '../lib/facts';
it('paginates editorial facts through the same UUID cursor without repeating them', async () => {
 query.mockResolvedValue([]);
 const first = await getFeedFacts(5, {});
 expect(first).toHaveLength(5);
 expect(first.every(f => f.hi && f.en.sourceUrl.startsWith('https://'))).toBe(true);
 const second = await getFeedFacts(5, {after:first[4]!.en.id});
 expect(second).toHaveLength(3);
 expect(second.every(f => f.en.id > first[4]!.en.id)).toBe(true);
 expect(new Set([...first,...second].map(f=>f.en.id)).size).toBe(8);
 const last = await getFeedFacts(5, {after:second[2]!.en.id});
 expect(last).toHaveLength(0);
});
