import { describe, expect, it } from 'vitest';
import { bindingsToRow, genderFrom, qidFromUri, stripDisambiguator } from '../src/sources/wikidata/bindings';

describe('stripDisambiguator', () => {
  it('removes Wikidata disambiguators in both scripts', () => {
    expect(stripDisambiguator('Darna Zaroori Hai (2006 film)')).toBe('Darna Zaroori Hai');
    expect(stripDisambiguator('डरना जरूरी है (2006 फ़िल्म)')).toBe('डरना जरूरी है');
    expect(stripDisambiguator('Mercury (disambiguation)')).toBe('Mercury');
    expect(stripDisambiguator('Kishore Kumar (singer)')).toBe('Kishore Kumar');
  });

  it('leaves a title that genuinely contains brackets alone', () => {
    expect(stripDisambiguator('Rock & Roll (Part 2)')).toBe('Rock & Roll (Part 2)');
    expect(stripDisambiguator('I Am Not There')).toBe('I Am Not There');
  });
});

describe('bindingsToRow', () => {
  it('folds LabelEn / LabelHi / Gender into one binding', () => {
    const row = bindingsToRow({
      person: { type: 'uri', value: 'http://www.wikidata.org/entity/Q465848' },
      personLabelEn: { type: 'literal', value: 'Meena Kumari', 'xml:lang': 'en' },
      personLabelHi: { type: 'literal', value: 'मीना कुमारी', 'xml:lang': 'hi' },
      personGender: { type: 'uri', value: 'http://www.wikidata.org/entity/Q6581072' },
    });
    expect(row.person).toEqual({
      qid: 'Q465848', en: 'Meena Kumari', hi: 'मीना कुमारी', gender: 'female',
    });
  });

  it('reads a non-entity URI as a plain value, which is how the citation arrives', () => {
    const row = bindingsToRow({
      article: { type: 'uri', value: 'https://en.wikipedia.org/wiki/Nargis' },
    });
    expect(row.article?.en).toBe('https://en.wikipedia.org/wiki/Nargis');
  });

  it('types numbers and dates from their XSD datatype', () => {
    const row = bindingsToRow({
      pop: { type: 'literal', value: '1428627663', datatype: 'http://www.w3.org/2001/XMLSchema#integer' },
      born: { type: 'literal', value: '1933-08-01T00:00:00Z', datatype: 'http://www.w3.org/2001/XMLSchema#dateTime' },
    });
    expect(row.pop?.number).toBe(1428627663);
    expect(row.born?.date).toBe('1933-08-01T00:00:00Z');
  });

  it('maps P21 values, including trans identities, to a usable gender', () => {
    expect(genderFrom('http://www.wikidata.org/entity/Q6581097')).toBe('male');
    expect(genderFrom('Q1052281')).toBe('female');
    expect(genderFrom('Q48270')).toBe('other');
    expect(genderFrom('Q999999999')).toBeUndefined();
  });

  it('extracts QIDs only from entity URIs', () => {
    expect(qidFromUri('http://www.wikidata.org/entity/Q42')).toBe('Q42');
    expect(qidFromUri('https://en.wikipedia.org/wiki/Q42')).toBeUndefined();
  });
});
