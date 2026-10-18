import { it, expect } from 'vitest';
import { balanceTopics, isDiscoveryFact, editorialFacts } from '../src/editorial';
import { parseFeedEnvelope } from '../src/mobile-feed';
it('spreads a large category across other available topics without losing facts', () => {
 const facts = [{id:'a',categoryId:1},{id:'b',categoryId:1},{id:'c',categoryId:1},{id:'d',categoryId:2},{id:'e',categoryId:3}];
 expect(balanceTopics(facts).map(f=>f.id)).toEqual(['a','d','e','b','c']);
});
it('excludes cinema and actor categories but retains science', () => {
 for(const categorySlug of ['bollywood','hollywood','actors-actresses','movies']) expect(isDiscoveryFact({categorySlug})).toBe(false);
 expect(isDiscoveryFact({categorySlug:'physics-chemistry'})).toBe(true);
});
it('ships complete bilingual fun facts with unique IDs and valid source metadata', () => {
 expect(editorialFacts.length).toBeGreaterThanOrEqual(8);
 const feed = parseFeedEnvelope({version:1,fetchedAt:new Date().toISOString(),facts:editorialFacts});
 expect(new Set(feed.facts.map(f=>f.en.id)).size).toBe(feed.facts.length);
 expect(feed.facts.every(f=>f.hi && f.en.body.length<350 && f.hi.body.length<350)).toBe(true);
});
