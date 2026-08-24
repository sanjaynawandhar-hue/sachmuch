export * from './types';
export * from './http';
export { createWikidataConnector } from './sources/wikidata/index';
export type { WikidataDeps } from './sources/wikidata/index';
export { bindingsToRow, qidFromUri, genderFrom, stripDisambiguator } from './sources/wikidata/bindings';
export { runSparql, paged, assertPageable, stripSparqlComments, WDQS_PAGE_SIZE } from './sources/wikidata/sparql-client';
export { createWorldBankConnector, warmCountryIndex } from './sources/world-bank/index';
export type { WorldBankDeps, RankedRow } from './sources/world-bank/index';
export { countryIndex, resetCountryIndex } from './sources/world-bank/countries';
