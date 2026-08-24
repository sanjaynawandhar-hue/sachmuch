/**
 * The source registry — one row per connector, seeded into `sources`.
 *
 * Every entry is free at our volumes. Anything requiring payment is excluded by
 * §2.1, and anything proprietary (IMDb, Rotten Tomatoes, paid sports feeds,
 * commercial publisher scrapes) by §5.2.
 *
 * Keep this in step with docs/SOURCES.md — that file carries the endpoint,
 * licence, attribution requirement and rate limit in prose, this one carries the
 * same facts in a form the pipeline can read.
 */

export interface SourceSeed {
  id: string;
  name: string;
  publisher: string;
  homepage: string;
  kind: 'sparql' | 'rest' | 'dump' | 'rss';
  licence: 'cc0' | 'cc_by' | 'cc_by_sa' | 'public_domain' | 'terms_only';
  attributionRequired: boolean;
  attributionText?: string;
  rateLimitRpm: number;
  needsKey: boolean;
  schedule: string;
  notes?: string;
}

export const SOURCE_REGISTRY: SourceSeed[] = [
  /* ── Tier 1: the engine ── */
  {
    id: 'wikidata-sparql',
    name: 'Wikidata Query Service',
    publisher: 'Wikidata',
    homepage: 'https://query.wikidata.org',
    kind: 'sparql',
    licence: 'cc0',
    attributionRequired: false,
    rateLimitRpm: 30,
    needsKey: false,
    schedule: '0 2 * * *',
    notes:
      'Structured statements are CC0: no attribution obligation, no share-alike. ' +
      'The majority of the corpus should come from here. 60s query timeout — page ' +
      'with LIMIT/OFFSET and keep each query narrow.',
  },
  {
    id: 'wikipedia-onthisday',
    name: 'Wikipedia On This Day feed',
    publisher: 'Wikipedia',
    homepage: 'https://en.wikipedia.org/api/rest_v1/',
    kind: 'rest',
    licence: 'cc_by_sa',
    attributionRequired: true,
    attributionText: 'From Wikipedia, CC BY-SA 4.0',
    rateLimitRpm: 60,
    needsKey: false,
    schedule: '0 3 * * *',
    notes:
      'English and Hindi, walked across all 366 days. Prose is CC BY-SA, so the ' +
      'article is used to locate the claim and its citation; the sentence is ' +
      'rendered from structured data through our own template.',
  },
  {
    id: 'wikipedia-dyk',
    name: 'Wikipedia Did You Know archive',
    publisher: 'Wikipedia',
    homepage: 'https://en.wikipedia.org/wiki/Wikipedia:Recent_additions',
    kind: 'rest',
    licence: 'cc_by_sa',
    attributionRequired: true,
    attributionText: 'From Wikipedia, CC BY-SA 4.0',
    rateLimitRpm: 30,
    needsKey: false,
    schedule: '0 4 * * 0',
    notes:
      'Running since February 2004. Used as a POINTER to claims and their ' +
      'citations, never as text to copy — see §5.4.',
  },

  /* ── Tier 2: breadth ── */
  {
    id: 'tmdb',
    name: 'The Movie Database',
    publisher: 'TMDB',
    homepage: 'https://www.themoviedb.org',
    kind: 'rest',
    licence: 'terms_only',
    attributionRequired: true,
    attributionText: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    rateLimitRpm: 40,
    needsKey: true,
    schedule: '0 5 * * *',
    notes:
      'Free v4 read-access token in TMDB_READ_TOKEN, sent as a Bearer header — ' +
      'not the v3 api_key query parameter. Generous limits (~50 req/s) well above ' +
      'what we use. Person and title data for Bollywood, Hollywood, Actors and TV. ' +
      'NOTE: intermittently TLS-reset by Indian ISPs, so ~2 in 3 local requests ' +
      'fail; retries handle it and CI is unaffected. See docs/LESSONS.md.',
  },
  {
    id: 'world-bank',
    name: 'World Bank Indicators API',
    publisher: 'The World Bank',
    homepage: 'https://data.worldbank.org',
    kind: 'rest',
    licence: 'cc_by',
    attributionRequired: true,
    attributionText: 'Source: World Bank Open Data, CC BY 4.0',
    rateLimitRpm: 60,
    needsKey: false,
    schedule: '0 6 * * 1',
    notes: 'No key at all. Economy, population, energy, climate. Feeds Finance and Environment.',
  },
  {
    id: 'data-gov-in',
    name: 'data.gov.in',
    publisher: 'Government of India',
    homepage: 'https://data.gov.in',
    kind: 'rest',
    licence: 'terms_only',
    attributionRequired: true,
    attributionText: 'Source: data.gov.in, Government of India (NDSAP)',
    rateLimitRpm: 30,
    needsKey: true,
    schedule: '0 7 * * 2',
    notes:
      '80,000+ datasets under NDSAP. This is the source that makes the India ' +
      'categories genuinely local instead of Wikipedia-translated.',
  },
  {
    id: 'opentdb',
    name: 'Open Trivia Database',
    publisher: 'OpenTDB',
    homepage: 'https://opentdb.com',
    kind: 'rest',
    licence: 'cc_by_sa',
    attributionRequired: true,
    attributionText: 'Questions from the Open Trivia Database, CC BY-SA 4.0',
    rateLimitRpm: 12,
    needsKey: false,
    schedule: '0 8 * * 3',
    notes: 'Keyless. Q&A converted into fact statements. English only — Hindi feed skips these.',
  },
  {
    id: 'numbers-api',
    name: 'Numbers API',
    publisher: 'Numbers API',
    homepage: 'http://numbersapi.com',
    kind: 'rest',
    licence: 'terms_only',
    attributionRequired: true,
    attributionText: 'Trivia from numbersapi.com',
    rateLimitRpm: 60,
    needsKey: false,
    schedule: '0 9 * * *',
    notes:
      'HTTP-ONLY. A browser on an HTTPS page blocks it as mixed content, so it is ' +
      'fetched server-side in the pipeline and never from the client. Its facts ' +
      'therefore cannot carry it as a displayed https source.',
  },
  {
    id: 'useless-facts',
    name: 'Useless Facts API',
    publisher: 'uselessfacts.jsph.pl',
    homepage: 'https://uselessfacts.jsph.pl',
    kind: 'rest',
    licence: 'cc_by_sa',
    attributionRequired: true,
    attributionText: 'From uselessfacts.jsph.pl, CC BY-SA 3.0',
    rateLimitRpm: 30,
    needsKey: false,
    schedule: '30 9 * * *',
    notes: 'Keyless, has a language parameter, each fact ships with a source field.',
  },
  {
    id: 'musicbrainz',
    name: 'MusicBrainz',
    publisher: 'MetaBrainz Foundation',
    homepage: 'https://musicbrainz.org',
    kind: 'rest',
    licence: 'cc0',
    attributionRequired: false,
    rateLimitRpm: 50,
    needsKey: false,
    schedule: '0 10 * * 4',
    notes: 'Core data is CC0. Strict one-request-per-second policy and a required User-Agent.',
  },
  {
    id: 'open-food-facts',
    name: 'Open Food Facts',
    publisher: 'Open Food Facts',
    homepage: 'https://world.openfoodfacts.org',
    kind: 'rest',
    licence: 'cc_by_sa',
    attributionRequired: true,
    attributionText: 'Data from Open Food Facts, ODbL',
    rateLimitRpm: 30,
    needsKey: false,
    schedule: '0 11 * * 5',
  },
  {
    id: 'gbif',
    name: 'GBIF species API',
    publisher: 'GBIF',
    homepage: 'https://www.gbif.org',
    kind: 'rest',
    licence: 'cc_by',
    attributionRequired: true,
    attributionText: 'Data from GBIF.org, CC BY 4.0',
    rateLimitRpm: 60,
    needsKey: false,
    schedule: '0 12 * * 6',
  },
  {
    id: 'pubchem',
    name: 'PubChem PUG REST',
    publisher: 'NCBI PubChem',
    homepage: 'https://pubchem.ncbi.nlm.nih.gov',
    kind: 'rest',
    licence: 'public_domain',
    attributionRequired: false,
    rateLimitRpm: 60,
    needsKey: false,
    schedule: '0 13 * * 1',
    notes: 'US government work, public domain. Max 5 requests/second by policy.',
  },
  {
    id: 'nasa-open',
    name: 'NASA Open APIs',
    publisher: 'NASA',
    homepage: 'https://api.nasa.gov',
    kind: 'rest',
    licence: 'public_domain',
    attributionRequired: false,
    rateLimitRpm: 30,
    needsKey: true,
    schedule: '0 14 * * *',
    notes: 'DEMO_KEY works but is heavily throttled; a free key raises it to 1000/hour.',
  },
];
