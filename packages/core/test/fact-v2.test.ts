import { describe, it, expect } from 'vitest';
import * as contract from '../src/index';

const hi = { hook: 'शुक्र का लंबा दिन', body: 'शुक्र का एक घूर्णन उसके एक वर्ष से अधिक समय लेता है।' };
const en = { hook: 'A very long day', body: 'Venus takes longer to rotate once than to orbit the Sun.' };
const fact = { id: 'claim-venus', originalLanguage: 'hi', texts: { hi }, categoryId: 1, categorySlug: 'space', categoryLabel: 'Space', categoryEmoji: '🪐', sourceUrl: 'https://science.nasa.gov/venus/', publisher: 'NASA', licence: 'cc0', knowledgeKind: 'fact' };
const api = contract as unknown as { parseFactV2: (x: unknown) => any; parseFeedV2: (x: unknown) => any; selectFactText: (f: any, l: string) => any };
describe('language-flexible facts', () => {
 it('exports the v2 parser and selection contract', () => {
  expect(typeof api.parseFactV2).toBe('function');
  expect(typeof api.selectFactText).toBe('function');
 });
 it('Hindi-only survives English preference', () => {
  expect(api.selectFactText(api.parseFactV2(fact), 'en')).toEqual({ language: 'hi', text: hi });
 });
 it('selects a complete preferred translation without changing identity', () => {
  const f = api.parseFactV2({ ...fact, texts: { hi, en } });
  expect(api.selectFactText(f, 'en')).toEqual({ language: 'en', text: en });
  expect(f.id).toBe('claim-venus');
 });
 it.each([
  { texts: {} }, { texts: { hi: { hook: hi.hook } } },
  { texts: { hi, en: { hook: '', body: en.body } } },
  { originalLanguage: 'en' }, { originalLanguage: 'fr' },
  { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:password@example.com' },
  { quality: NaN }, { quality: 2 }, { categoryId: 0 },
  { knowledgeKind: 'rumour' }, { validUntil: 'yesterday' }, { asOf: '2026-02-30' },
 ])('rejects invalid or incomplete facts %j', patch => {
  expect(() => api.parseFactV2({ ...fact, ...patch })).toThrow();
 });
 it('validates envelopes and counts without requiring English', () => {
  const feed = { version: 2, fetchedAt: '2026-10-21T00:00:00Z', facts: [fact], nextCursor: null, snapshotId: 'snapshot-1', totalEligible: 100001 };
  expect(api.parseFeedV2(feed).facts[0].texts.hi).toEqual(hi);
  for (const patch of [{version:1}, {facts:[fact,fact]}, {totalEligible:-1}, {totalEligible:0}, {nextCursor:1}, {snapshotId:''}, {fetchedAt:'bad'}, {nextCursor:'x'.repeat(513)}]) {
   expect(() => api.parseFeedV2({...feed,...patch})).toThrow();
  }
 });
});
it('upgrades legacy saved records without changing identity or inventing Hindi', async()=>{
 const {upgradeLegacyFact} = await import('../src/fact-v2');
 const legacy = {en:{id:'old-id',categoryId:1,categorySlug:'space',categoryLabel:'Space',categoryEmoji:'🪐',hook:en.hook,body:en.body,sourceUrl:'https://science.nasa.gov/venus/',publisher:'NASA',licence:'cc0',corroborationCount:1,difficulty:1,entities:[]}};
 const upgraded=upgradeLegacyFact(legacy);
 expect(upgraded.id).toBe('old-id');
 expect(upgraded.texts).toEqual({en});
});
it('preserves valid legacy bookmarks with empty optional metadata',async()=>{
 const {upgradeLegacyFact}=await import('../src/fact-v2');
 const old={en:{id:'saved',categoryId:1,categorySlug:'space',categoryLabel:'Space',categoryEmoji:'✦',hook:en.hook,body:en.body,sourceUrl:'https://example.org',publisher:'Example',licence:'cc0',corroborationCount:1,difficulty:1,entities:[],attributionText:'',templateId:''}};
 expect(upgradeLegacyFact(old).id).toBe('saved');
});
