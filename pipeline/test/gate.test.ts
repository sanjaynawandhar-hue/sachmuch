import { describe, expect, it } from 'vitest';
import type { FactDraft } from '@sachmuch/templates';
import { checkStructure } from '../src/gate/structural';
import { checkBlocklist } from '../src/gate/blocklist';
import {
  dedupeBatch, DUPLICATE_THRESHOLD, factHash, isNearDuplicate, normalizeForHash, trigramSimilarity,
} from '../src/gate/dedupe';
import { runGate, scoreQuality } from '../src/gate/index';

const BODY_40 =
  'Nargis received the Filmfare Award for Best Actress in 1958, an early recognition in a career ' +
  'that had already spanned more than a decade of Hindi cinema, and one that placed her among the ' +
  'first performers the young award had chosen to honour in that category at all.';

function draft(over: Partial<FactDraft> = {}): FactDraft {
  return {
    templateId: 'award-received',
    sourceId: 'wikidata-sparql',
    categoryId: 2,
    hookEn: 'Nargis won the Filmfare Award for Best Actress in 1958.',
    bodyEn: BODY_40,
    hookHi: 'नरगिस को 1958 में फ़िल्मफ़ेयर सर्वश्रेष्ठ अभिनेत्री पुरस्कार मिला।',
    bodyHi: 'नरगिस को 1958 में यह सम्मान दिया गया।',
    hiMissing: false,
    sourceUrl: 'https://en.wikipedia.org/wiki/Nargis',
    difficulty: 3,
    entityQids: ['Q234431'],
    rowKey: 'award-received|person=Q234431',
    ...over,
  };
}

const OFFLINE = { sourceId: 'test', rateLimitRpm: 60, offline: true };

describe('structural gate', () => {
  it('passes a well-formed bilingual draft', () => {
    expect(checkStructure(draft())).toEqual([]);
  });

  it('catches an unresolved placeholder', () => {
    const f = checkStructure(draft({ hookEn: 'Nargis won the {award} in 1958.' }));
    expect(f.map((x) => x.rule)).toContain('structural.unresolved_placeholder');
  });

  it('catches a raw Wikidata identifier leaking onto the card', () => {
    const f = checkStructure(draft({ hookEn: 'Nargis won the Q1414482 in 1958.' }));
    expect(f.map((x) => x.rule)).toContain('structural.identifier_leak');
  });

  it('catches a body outside the 40–120 word band', () => {
    expect(checkStructure(draft({ bodyEn: 'Too short.' })).map((x) => x.rule))
      .toContain('structural.body_length');
  });

  it('catches a hook over 150 characters', () => {
    expect(checkStructure(draft({ hookEn: 'x'.repeat(151) })).map((x) => x.rule))
      .toContain('structural.hook_too_long');
  });

  it('catches half-rendered Hindi, which the schema constraint also forbids', () => {
    expect(checkStructure(draft({ bodyHi: '' })).map((x) => x.rule))
      .toContain('structural.partial_hindi');
  });

  it('catches a null leaking into the sentence', () => {
    expect(checkStructure(draft({ hookEn: 'Nargis won undefined in 1958.' })).map((x) => x.rule))
      .toContain('structural.null_leak');
  });
});

describe('blocklist', () => {
  it('lets an ordinary fact through', () => {
    expect(checkBlocklist(draft())).toEqual([]);
  });

  it('blocks a medical claim phrased as advice', () => {
    const f = checkBlocklist(draft({ bodyEn: `${BODY_40} You should take 500 mg daily.` }));
    expect(f.map((x) => x.rule)).toContain('blocklist.medical_advice');
  });

  it('blocks a claim about an ongoing legal case', () => {
    const f = checkBlocklist(draft({ hookEn: 'The company is currently facing trial in Mumbai.' }));
    expect(f.map((x) => x.rule)).toContain('blocklist.ongoing_legal_case');
  });

  it('blocks hedged, unverifiable framing', () => {
    const f = checkBlocklist(draft({ hookEn: 'It is said that the temple was built overnight.' }));
    expect(f.map((x) => x.rule)).toContain('blocklist.unverifiable_claim_framing');
  });

  it('blocks communal framing in Hindi as well as English', () => {
    const f = checkBlocklist(draft({ hookHi: 'हिंदू बनाम मुस्लिम विवाद।' }));
    expect(f.map((x) => x.rule)).toContain('blocklist.communal_or_caste_framing');
  });

  it('blocks a named person with no entity behind them', () => {
    const f = checkBlocklist(draft({ entityQids: [], hookEn: 'Rajesh Sharma bought a house in Pune.' }));
    expect(f.map((x) => x.rule)).toContain('blocklist.unbacked_person');
  });

  it('allows a named person who IS backed by an entity', () => {
    expect(checkBlocklist(draft())).toEqual([]);
  });
});

describe('dedupe', () => {
  it('normalises away punctuation, articles and digit grouping', () => {
    expect(normalizeForHash('The film earned ₹1,00,000 in 1958.'))
      .toBe(normalizeForHash('Film earned ₹100000 in 1958'));
  });

  it('collides on row identity, so re-ingesting a row is never a new fact', () => {
    // Variant selection is deterministic per row, so the same row always renders
    // the same way; what must collide is the same row seen twice, including
    // after a template's phrasings are edited.
    const a = draft({ hookEn: 'Nargis won the Filmfare Award for Best Actress in 1958.' });
    const b = draft({ hookEn: 'In 1958, Nargis won the Filmfare Award for Best Actress.' });
    expect(factHash(a)).toBe(factHash(b));
  });

  it('does NOT merge a reversed relation, which sorting the words would have done', () => {
    const a = draft({ rowKey: 'match|india-beat-australia', hookEn: 'India beat Australia in the 1983 final.' });
    const b = draft({ rowKey: 'match|australia-beat-india', hookEn: 'Australia beat India in the 1983 final.' });
    expect(factHash(a)).not.toBe(factHash(b));
  });

  it('gives genuinely different rows different hashes', () => {
    const a = draft();
    const b = draft({ rowKey: 'award-received|person=Q465848', entityQids: ['Q465848'] });
    expect(factHash(a)).not.toBe(factHash(b));
  });

  it('scores trigram similarity the way pg_trgm does', () => {
    expect(trigramSimilarity('the quick brown fox', 'the quick brown fox')).toBe(1);
    expect(isNearDuplicate('Nargis won Best Actress in 1958', 'Nargis won Best Actress in 1958!')).toBe(true);
    expect(isNearDuplicate('Nargis won Best Actress', 'The Ganges is a river in India')).toBe(false);
  });

  it('drops duplicates within a batch and keeps the first', () => {
    const { kept, dropped } = dedupeBatch([
      draft(),
      draft({ hookEn: 'In 1958, Nargis won the Filmfare Award for Best Actress.' }),
      draft({ rowKey: 'river-length|Q5089', hookEn: 'The Ganges flows 2,525 km across northern India.', entityQids: ['Q5089'] }),
    ]);
    expect(kept).toHaveLength(2);
    expect(dropped[0]!.reason).toBe('exact_duplicate');
  });

  it('does not treat facts in different categories as duplicates of each other', () => {
    const { kept } = dedupeBatch([draft({ categoryId: 2 }), draft({ categoryId: 4, hookEn: 'Nargis is remembered across Indian cinema history.' })]);
    expect(kept).toHaveLength(2);
  });
});

describe('quality scoring', () => {
  it('rewards a bilingual, entity-linked fact over an English-only one', () => {
    const bilingual = scoreQuality(draft());
    const englishOnly = scoreQuality(draft({ hiMissing: true, hookHi: undefined, bodyHi: undefined }));
    expect(bilingual).toBeGreaterThan(englishOnly);
  });

  it('stays inside 0..1', () => {
    expect(scoreQuality(draft({ hookEn: 'A.' , entityQids: []}))).toBeGreaterThanOrEqual(0);
    expect(scoreQuality(draft({ entityQids: ['Q1', 'Q2', 'Q3'] }))).toBeLessThanOrEqual(1);
  });
});

describe('runGate', () => {
  it('passes a clean draft', async () => {
    const r = await runGate(draft(), OFFLINE);
    expect(r.pass).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.normalizedHash).toHaveLength(40);
  });

  it('fails and explains why', async () => {
    const r = await runGate(draft({ hookEn: 'Won the {award}.' }), OFFLINE);
    expect(r.pass).toBe(false);
    expect(r.findings.map((f) => f.rule)).toContain('structural.unresolved_placeholder');
  });

  it('skips the network check when a cheap rule already failed', async () => {
    const r = await runGate(draft({ hookEn: 'x'.repeat(200), sourceUrl: 'http://insecure.example' }), OFFLINE);
    expect(r.findings.map((f) => f.rule)).not.toContain('source.not_https');
  });

  it('rejects a plain-HTTP citation, which the web client would block as mixed content', async () => {
    const r = await runGate(draft({ sourceUrl: 'http://numbersapi.com/42' }), OFFLINE);
    expect(r.findings.map((f) => f.rule)).toContain('source.not_https');
  });
});

describe('transient versus permanent failure', () => {
  it('marks an unreachable source retryable, so it is not rejected forever', async () => {
    const r = await runGate(draft({ sourceUrl: 'https://example.invalid/nope' }),
      { sourceId: 'test', rateLimitRpm: 60 });
    expect(r.pass).toBe(false);
    expect(r.findings.map((f) => f.rule)).toContain('source.unreachable');
    expect(r.retryable).toBe(true);
  });

  it('does not mark a structural defect retryable — that will fail identically forever', async () => {
    const r = await runGate(draft({ hookEn: 'Won the {award}.' }), OFFLINE);
    expect(r.retryable).toBe(false);
  });

  it('treats a mixed failure as permanent, since the structural half will not fix itself', async () => {
    const r = await runGate(draft({ hookEn: 'x'.repeat(200), sourceUrl: 'https://example.invalid/x' }),
      { sourceId: 'test', rateLimitRpm: 60 });
    expect(r.retryable).toBe(false);
  });

  it('reports a clean draft as not retryable, because there is nothing to retry', async () => {
    expect((await runGate(draft(), OFFLINE)).retryable).toBe(false);
  });
});

describe('near-duplicate detection needs more than similar words', () => {
  const mountain = 'Mount Everest ranks 1st among the highest mountains on earth, at 8,850 m.';
  const desert = 'Sahara ranks 1st among the largest deserts on earth, at 9,200,000 sq km.';

  it('scores facts from ONE template far higher than facts from two', () => {
    // Measured, not assumed: two mountains from the same template score ~0.53,
    // while a mountain against a desert scores ~0.25. Neither reaches the 0.85
    // threshold, so text alone was never the thing swallowing templates — but
    // the entity guard below is what keeps a future, tighter threshold safe.
    const k2 = 'K2 ranks 2nd among the highest mountains on earth, at 8,611 m.';
    const sameTemplate = trigramSimilarity(mountain, k2);
    const acrossTemplates = trigramSimilarity(mountain, desert);
    expect(sameTemplate).toBeGreaterThan(acrossTemplates);
    expect(acrossTemplates).toBeLessThan(DUPLICATE_THRESHOLD);
  });

  it('does not treat facts about different entities as duplicates', () => {
    expect(isNearDuplicate(mountain, desert, ['Q513'], ['Q6583'])).toBe(false);
  });

  it('still catches the same claim about the same entity', () => {
    const a = 'Mount Everest ranks 1st among the highest mountains on earth, at 8,850 m.';
    const b = 'Mount Everest ranks 1st among the highest mountains on earth, at 8,849 m.';
    expect(isNearDuplicate(a, b, ['Q513'], ['Q513'])).toBe(true);
  });

  it('falls back to text alone when neither side has an entity', () => {
    expect(isNearDuplicate(mountain, mountain, [], [])).toBe(true);
    expect(isNearDuplicate(mountain, 'The Ganges is a river.', [], [])).toBe(false);
  });

  it('does not let one template swallow another in a batch', () => {
    const batch = [
      draft({ rowKey: 'mt|Q513', hookEn: mountain, entityQids: ['Q513'], categoryId: 17 }),
      draft({ rowKey: 'ds|Q6583', hookEn: desert, entityQids: ['Q6583'], categoryId: 17 }),
    ];
    expect(dedupeBatch(batch).kept).toHaveLength(2);
  });
});
