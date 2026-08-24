import { describe, expect, it } from 'vitest';
import { bigNumber, indianGrouping, formatDateLong, ordinal } from '../src/format';
import { renderPattern, RenderError, pickVariant, isQidLeak } from '../src/render';
import { draftFromRow, validateTemplate, rowKeyFor } from '../src/template';
import type { Row, TemplateDef } from '../src/types';

const AWARD: TemplateDef = {
  id: 'award-received',
  significance: 'record',
  sourceId: 'wikidata-sparql',
  categoryId: 2,
  subtopics: ['bollywood-awards'],
  query: 'SELECT ...',
  hook: {
    en: [
      '{person} won the {award} in {year|year}.',
      'In {year|year}, {person} took home the {award}.',
      'The {award} went to {person} in {year|year}.',
    ],
    hi: [
      '{person} को {year|year} में {award} मिला।',
      '{year|year} में {award} {person} को मिला।',
      '{person} ने {year|year} में {award} जीता।',
    ],
  },
  body: {
    en: [
      '{person} received the {award}, one of the industry’s recognitions, in {year|year}.',
      'The award was presented to {person} in {year|year}.',
      '{person} was named the recipient in {year|year}.',
    ],
    hi: [
      '{person} को {year|year} में {award} से नवाज़ा गया।',
      '{year|year} में यह सम्मान {person} को दिया गया।',
      '{person} इस पुरस्कार के विजेता {year|year} में [बने|बनीं]@person।',
    ],
  },
  decays: false,
  sourceFrom: 'article',
  minRows: 20,
  difficulty: 3,
  requires: ['person', 'award', 'year', 'article'],
  entityVars: ['person', 'award'],
};

const fullRow: Row = {
  person: { en: 'Nargis', hi: 'नरगिस', qid: 'Q234431', gender: 'female' },
  award: { en: 'Filmfare Best Actress Award', hi: 'फ़िल्मफ़ेयर सर्वश्रेष्ठ अभिनेत्री पुरस्कार', qid: 'Q1420018' },
  year: { date: '+1958-01-01T00:00:00Z' },
  article: { en: 'https://en.wikipedia.org/wiki/Nargis' },
};

describe('Indian number formatting', () => {
  it('groups the Indian way, not the Western way', () => {
    expect(indianGrouping(12345678)).toBe('1,23,45,678');
    expect(indianGrouping(100000)).toBe('1,00,000');
    expect(indianGrouping(999)).toBe('999');
  });

  it('uses lakh and crore in Hindi, million and billion in English', () => {
    expect(bigNumber(14_00_00_000, 'hi')).toBe('14 करोड़');
    expect(bigNumber(140_000_000, 'en')).toBe('140 million');
    expect(bigNumber(250000, 'hi')).toBe('2.5 लाख');
    expect(bigNumber(45000, 'hi')).toBe('45 हज़ार');
  });

  it('stops at crore rather than climbing to arab, because nobody says arab', () => {
    expect(bigNumber(8_000_000_000, 'hi')).toBe('800 करोड़');
    expect(bigNumber(8_000_000_000, 'en')).toBe('8 billion');
  });

  it('localises month names', () => {
    expect(formatDateLong('+1930-03-12T00:00:00Z', 'en')).toBe('12 March 1930');
    expect(formatDateLong('+1930-03-12T00:00:00Z', 'hi')).toBe('12 मार्च 1930');
  });

  it('uses Hindi ordinals', () => {
    expect(ordinal(1, 'hi')).toBe('पहला');
    expect(ordinal(9, 'hi')).toBe('9वाँ');
    expect(ordinal(3, 'en')).toBe('3rd');
  });
});

describe('gender agreement', () => {
  it('picks the feminine verb form for a female subject', () => {
    const out = renderPattern('{person} विजेता [बने|बनीं]@person।', fullRow, 'hi');
    expect(out).toBe('नरगिस विजेता बनीं।');
  });

  it('picks the masculine verb form for a male subject', () => {
    const row: Row = { ...fullRow, person: { en: 'Dilip Kumar', hi: 'दिलीप कुमार', gender: 'male' } };
    expect(renderPattern('{person} विजेता [बने|बनीं]@person।', row, 'hi')).toBe('दिलीप कुमार विजेता बने।');
  });

  it('refuses to guess when the gender is unknown, rather than defaulting to masculine', () => {
    const row: Row = { ...fullRow, person: { en: 'Someone', hi: 'कोई' } };
    expect(() => renderPattern('{person} विजेता [बने|बनीं]@person।', row, 'hi')).toThrow(RenderError);
  });

  it('strips the gendered construct in English, keeping the first form', () => {
    expect(renderPattern('They [were|were]@person here.', fullRow, 'en')).toBe('They were here.');
  });
});

describe('renderPattern guards', () => {
  it('rejects a Wikidata QID that leaked through the label service', () => {
    expect(isQidLeak('Q12345')).toBe(true);
    const row: Row = { ...fullRow, award: { en: 'Q1420018', hi: 'Q1420018' } };
    expect(() => renderPattern('{award}', row, 'en')).toThrow(/qid_leak/);
  });

  it('rejects an unbound variable rather than emitting a brace', () => {
    expect(() => renderPattern('{nosuchvar}', fullRow, 'en')).toThrow(/unbound/);
  });

  it('fails on a missing Hindi label', () => {
    const row: Row = { ...fullRow, award: { en: 'Filmfare Award' } };
    expect(() => renderPattern('{award}', row, 'hi')).toThrow(/missing_hi_label/);
  });
});

describe('variant selection', () => {
  it('is deterministic — the same row always reads the same way', () => {
    const key = rowKeyFor(AWARD, fullRow);
    const a = pickVariant(AWARD.hook.en, key, 'hook:en');
    const b = pickVariant(AWARD.hook.en, key, 'hook:en');
    expect(a).toBe(b);
  });

  it('spreads across all phrasings — 800 rows must not read as 800 copies', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      seen.add(pickVariant(AWARD.hook.en, `award-received|person=Q${i}`, 'hook:en'));
    }
    expect(seen.size).toBe(AWARD.hook.en.length);
  });
});

describe('draftFromRow', () => {
  it('produces a bilingual draft from a complete row', () => {
    const d = draftFromRow(AWARD, fullRow, { subtopicSlug: 'bollywood-awards' });
    expect(d).not.toBeNull();
    expect(d!.hiMissing).toBe(false);
    expect(d!.hookHi).toContain('नरगिस');
    expect(d!.hookEn).toContain('Nargis');
    expect(d!.hookEn).toContain('1958');
    expect(d!.entityQids).toEqual(['Q234431', 'Q1420018']);
    expect(d!.sourceUrl).toBe('https://en.wikipedia.org/wiki/Nargis');
  });

  it('falls back to an English-only draft, flagged, when Hindi is unavailable', () => {
    const row: Row = { ...fullRow, award: { en: 'Filmfare Best Actress Award', qid: 'Q1420018' } };
    const d = draftFromRow(AWARD, row)!;
    expect(d.hiMissing).toBe(true);
    expect(d.hookHi).toBeUndefined();
    expect(d.hiSkipReason).toMatch(/missing_hi_label:award/);
    expect(d.hookEn).toContain('Nargis');
  });

  it('drops a row with no usable source URL', () => {
    const row: Row = { ...fullRow, article: { en: 'not-a-url' } };
    expect(draftFromRow(AWARD, row)).toBeNull();
  });

  it('drops a row missing a required binding', () => {
    const row: Row = { ...fullRow };
    delete row.award;
    expect(draftFromRow(AWARD, row)).toBeNull();
  });

  it('sets validUntil only for decaying templates', () => {
    expect(draftFromRow(AWARD, fullRow)!.validUntil).toBeUndefined();
    const decaying: TemplateDef = { ...AWARD, decays: true, validForDays: 180 };
    const d = draftFromRow(decaying, fullRow, { now: new Date('2026-01-01T00:00:00Z') })!;
    expect(d.validUntil!.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });
});

describe('validateTemplate', () => {
  it('accepts a well-formed template', () => {
    expect(validateTemplate(AWARD)).toEqual([]);
  });

  it('rejects a template with a single phrasing', () => {
    const bad: TemplateDef = { ...AWARD, hook: { en: ['{person} won.'], hi: ['{person} जीता।'] } };
    expect(validateTemplate(bad).map((p) => p.problem)).toContain('hook.en must hold 3–5 phrasings, found 1');
  });

  it('rejects decays without an expiry', () => {
    const bad: TemplateDef = { ...AWARD, decays: true };
    expect(validateTemplate(bad).map((p) => p.problem)).toContain('decays: true requires validForDays');
  });
});

describe('Hindi ordinal case', () => {
  it('uses the oblique form before a postposition', () => {
    const row: Row = { rank: { number: 137 } };
    // "137वाँ नंबर पर" is ungrammatical; Hindi inflects an adjective before पर.
    expect(renderPattern('भारत {rank|ordobl} नंबर पर है।', row, 'hi')).toBe('भारत 137वें नंबर पर है।');
    expect(renderPattern('भारत {rank|ord} है।', row, 'hi')).toBe('भारत 137वाँ है।');
  });

  it('inflects the irregular low ordinals too', () => {
    for (const [n, direct, oblique] of [[1, 'पहला', 'पहले'], [4, 'चौथा', 'चौथे'], [6, 'छठा', 'छठे']] as const) {
      const row: Row = { n: { number: n } };
      expect(renderPattern('{n|ord}', row, 'hi')).toBe(direct);
      expect(renderPattern('{n|ordobl}', row, 'hi')).toBe(oblique);
    }
  });

  it('leaves English ordinals alone, since English has no oblique case', () => {
    const row: Row = { rank: { number: 137 } };
    expect(renderPattern('{rank|ordobl}', row, 'en')).toBe('137th');
  });
});

describe('decimal precision', () => {
  it('rounds a published statistic to one decimal place', () => {
    // A literacy rate arrives from the World Bank as 78.163; a card is a
    // sentence, not a spreadsheet export.
    const row: Row = { v: { number: 78.163 } };
    expect(renderPattern('{v|num}%', row, 'en')).toBe('78.2%');
    expect(renderPattern('{v|num}%', row, 'hi')).toBe('78.2%');
  });

  it('leaves whole numbers exactly as they are', () => {
    const row: Row = { v: { number: 17125190 } };
    expect(renderPattern('{v|num}', row, 'en')).toBe('17,125,190');
    expect(renderPattern('{v|num}', row, 'hi')).toBe('1,71,25,190');
  });
});

describe('Latin text filed as a Hindi label', () => {
  it('rejects a Hindi label with no Devanagari in it', () => {
    // Wikidata has "manaslu" filed as the @hi label for Manaslu.
    const row: Row = { peak: { en: 'Manaslu', hi: 'manaslu' } };
    expect(() => renderPattern('{peak}', row, 'hi')).toThrow(/latin_in_hindi_label/);
  });

  it('accepts a genuine Hindi label', () => {
    const row: Row = { peak: { en: 'Lhotse', hi: 'ल्होत्से' } };
    expect(renderPattern('{peak}', row, 'hi')).toBe('ल्होत्से');
  });

  it('accepts Devanagari that also carries digits or Latin inside it', () => {
    const row: Row = { tower: { en: 'Merdeka 118', hi: 'मर्देका 118' } };
    expect(renderPattern('{tower}', row, 'hi')).toBe('मर्देका 118');
  });

  it('leaves the English side alone', () => {
    const row: Row = { peak: { en: 'Manaslu', hi: 'manaslu' } };
    expect(renderPattern('{peak}', row, 'en')).toBe('Manaslu');
  });
});
