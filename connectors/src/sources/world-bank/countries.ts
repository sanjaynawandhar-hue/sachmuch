import type { Binding } from '@sachmuch/templates';
import { runSparql } from '../wikidata/sparql-client';
import { qidFromUri } from '../wikidata/bindings';

/**
 * ISO 3166-1 alpha-3 -> country identity, in both languages.
 *
 * The World Bank keys everything on ISO3 codes and returns English names only.
 * Wikidata carries the same codes (P298) with Hindi labels for all 196 current
 * countries — 100% coverage, measured. That single join is what makes an entire
 * class of statistical facts bilingual, and it also supplies the QID so a World
 * Bank fact lands in the same entity graph as a Wikidata one.
 */

export interface CountryIdentity {
  qid: string;
  en: string;
  hi?: string;
}

let cache: Map<string, CountryIdentity> | null = null;

export async function countryIndex(sourceId = 'wikidata-sparql'): Promise<Map<string, CountryIdentity>> {
  if (cache) return cache;

  const res = await runSparql(`
SELECT ?c ?iso ?en ?hi WHERE {
  ?c wdt:P31 wd:Q3624078 ; wdt:P298 ?iso .
  FILTER NOT EXISTS { ?c wdt:P576 ?dissolved }
  ?c rdfs:label ?en . FILTER(LANG(?en) = "en")
  OPTIONAL { ?c rdfs:label ?hi . FILTER(LANG(?hi) = "hi") }
}`, sourceId, 30);

  const map = new Map<string, CountryIdentity>();
  for (const row of res.results.bindings) {
    const iso = row.iso?.value;
    const qid = row.c ? qidFromUri(row.c.value) : undefined;
    const en = row.en?.value;
    if (!iso || !qid || !en) continue;
    map.set(iso, { qid, en, ...(row.hi?.value ? { hi: row.hi.value } : {}) });
  }
  cache = map;
  return map;
}

/** Exposed for tests, which must not share a warm cache between cases. */
export function resetCountryIndex(): void {
  cache = null;
}

export function countryBinding(id: CountryIdentity): Binding {
  return { qid: id.qid, en: id.en, ...(id.hi ? { hi: id.hi } : {}) };
}
