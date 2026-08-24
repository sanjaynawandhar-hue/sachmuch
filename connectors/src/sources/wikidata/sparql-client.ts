import { fetchJson } from '../../http';
import { SourceError } from '../../types';

export const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';

export interface SparqlBinding {
  type: 'uri' | 'literal' | 'bnode';
  value: string;
  datatype?: string;
  'xml:lang'?: string;
}

export interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: Record<string, SparqlBinding>[] };
}

/**
 * Wikidata's public endpoint kills a query at 60 seconds. Paging with
 * LIMIT/OFFSET and keeping each query narrow is not an optimisation here — it is
 * the difference between a template that works and one that always times out.
 */
export const WDQS_TIMEOUT_MS = 60_000;
export const WDQS_PAGE_SIZE = 500;

/** SPARQL comments run from # to end of line. */
export const stripSparqlComments = (query: string) => query.replace(/#[^\n]*/g, '');

/**
 * Templates must not carry their own LIMIT — the connector owns paging.
 * Comments are stripped first: a comment explaining why ORDER BY matters to the
 * connector's LIMIT is not itself a LIMIT clause.
 */
export function assertPageable(query: string, templateId: string): void {
  if (/\bLIMIT\b/i.test(stripSparqlComments(query))) {
    throw new Error(
      `template ${templateId}: remove LIMIT from the query, the connector pages with LIMIT/OFFSET`,
    );
  }
}

export function paged(query: string, offset: number, limit = WDQS_PAGE_SIZE): string {
  return `${query.trim()}\nLIMIT ${limit}\nOFFSET ${offset}`;
}

export async function runSparql(
  query: string,
  sourceId: string,
  rateLimitRpm: number,
): Promise<SparqlResults> {
  const asGet = `${WDQS_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const common = {
    sourceId,
    rateLimitRpm,
    timeoutMs: WDQS_TIMEOUT_MS + 5_000,
    headers: { accept: 'application/sparql-results+json' },
  } as const;

  // GET is cacheable at the WDQS edge, so prefer it; fall back to POST when the
  // encoded query would exceed a safe URL length.
  const res =
    asGet.length <= 7000
      ? await fetchJson<SparqlResults>(asGet, common)
      : await fetchJson<SparqlResults>(WDQS_ENDPOINT, {
          ...common,
          method: 'POST',
          headers: {
            ...common.headers,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: `query=${encodeURIComponent(query)}&format=json`,
        });

  if (!res?.results?.bindings) throw new SourceError(sourceId, 'malformed SPARQL response');
  return res;
}
