import { draftFromRow, type FactDraft, type TemplateDef } from '@sachmuch/templates';
import type { Connector, FetchResult, Task } from '../../types';
import { bindingsToRow } from './bindings';
import {
  assertPageable, paged, runSparql, WDQS_PAGE_SIZE, type SparqlBinding,
} from './sparql-client';

export interface WikidataDeps {
  /** Enabled templates whose sourceId is this connector. */
  templates: TemplateDef[];
  /** Taxonomy lookup, injected so connectors never import the database package. */
  subtopicQids(slug: string): string[];
  /** The subtopic's category, which a produced fact is filed under. */
  subtopicCategoryId(slug: string): number | undefined;
}

const SOURCE_ID = 'wikidata-sparql';

/** `{{SCOPE}}` becomes a VALUES clause pinning the query to one subtopic. */
function applyScope(query: string, scopeVar: string | undefined, qids: string[]): string {
  if (!scopeVar) return query;
  const values = qids.length > 0 ? `VALUES ?${scopeVar} { ${qids.map((q) => `wd:${q}`).join(' ')} }` : '';
  return query.replace(/\{\{SCOPE\}\}/g, values);
}

/**
 * Wikidata SPARQL — the single most important source in the app.
 *
 * Structured statements are CC0: no attribution obligation, no share-alike, safe
 * to build a commercial product on. Every entity carries a QID, which is what
 * makes the fact graph possible. The Wikipedia article we link as the source is
 * CC BY-SA, but we only LINK it — the sentence itself is rendered from the CC0
 * statements through our own template, never copied from the article prose.
 */
export function createWikidataConnector(deps: WikidataDeps): Connector {
  const byId = new Map(deps.templates.map((t) => [t.id, t]));

  return {
    id: SOURCE_ID,
    kind: 'sparql',
    publisher: 'Wikidata',
    homepage: 'https://www.wikidata.org',
    licence: 'cc0',
    attributionRequired: false,
    // 30/min is well inside WDQS's informal allowance; we are crawling once,
    // not continuously, and being a good citizen keeps the source alive.
    rateLimitRpm: 30,
    needsKey: false,
    schedule: '0 2 * * *',

    async discover(): Promise<Task[]> {
      const tasks: Task[] = [];
      for (const t of deps.templates) {
        assertPageable(t.query, t.id);
        if (!t.scopeVar) {
          tasks.push({ key: `${SOURCE_ID}:${t.id}`, templateId: t.id, categoryId: t.categoryId });
          continue;
        }
        for (const slug of t.subtopics) {
          const qids = deps.subtopicQids(slug);
          // A scoped template with no anchor QIDs would degenerate into an
          // unbounded query, so it is skipped rather than run unscoped.
          if (qids.length === 0) continue;
          tasks.push({
            key: `${SOURCE_ID}:${t.id}:${slug}`,
            templateId: t.id,
            subtopicSlug: slug,
            categoryId: deps.subtopicCategoryId(slug) ?? t.categoryId,
            params: { qids },
          });
        }
      }
      return tasks;
    },

    async fetch(task: Task, cursor?: string): Promise<FetchResult> {
      const t = byId.get(task.templateId ?? '');
      if (!t) throw new Error(`unknown template ${task.templateId}`);

      const offset = cursor ? Number(cursor) : 0;
      const qids = (task.params?.qids as string[] | undefined) ?? [];
      const query = paged(applyScope(t.query, t.scopeVar, qids), offset);
      const res = await runSparql(query, SOURCE_ID, this.rateLimitRpm);
      const rows = res.results.bindings;

      /*
       * Ranked templates.
       *
       * "Kangchenjunga is 8,586 m high" is a measurement. "Kangchenjunga is the
       * third-highest mountain on earth" is a fact. SPARQL will order a result
       * set but will not hand back a position, so the rank is computed here over
       * the first page and only the top N are emitted. Paging is stopped
       * deliberately: page two of a ranked list is by definition not notable.
       */
      const rankBy = t.params?.rankBy as string | undefined;
      if (rankBy) {
        const top = (t.params?.top as number | undefined) ?? 15;
        const ascending = t.params?.ascending === true;
        const numeric = rows
          .map((r) => ({ row: r, v: Number(r[rankBy]?.value) }))
          .filter((x) => Number.isFinite(x.v));
        numeric.sort((a, b) => (ascending ? a.v - b.v : b.v - a.v));

        const seen = new Set<string>();
        const ranked: Record<string, unknown>[] = [];
        for (const x of numeric) {
          // The same entity can appear more than once when a property carries
          // several values; the highest-ranked occurrence is the one that counts.
          const key = x.row[rankBy === 'v' ? 'item' : 'item']?.value ?? JSON.stringify(x.row);
          if (seen.has(key)) continue;
          seen.add(key);
          ranked.push({ ...x.row, __rank: { type: 'literal', value: String(ranked.length + 1) },
                        __total: { type: 'literal', value: String(numeric.length) } });
          if (ranked.length >= top) break;
        }
        return { rows: ranked };
      }

      return {
        rows,
        // A short page means the result set is exhausted; stop rather than
        // issuing one more query that we know returns nothing.
        ...(rows.length === WDQS_PAGE_SIZE ? { nextCursor: String(offset + WDQS_PAGE_SIZE) } : {}),
      };
    },

    map(row: unknown, task: Task): FactDraft[] {
      const t = byId.get(task.templateId ?? '');
      if (!t) return [];
      const bound = bindingsToRow(row as Record<string, SparqlBinding>);
      const draft = draftFromRow(t, bound, {
        ...(task.subtopicSlug ? { subtopicSlug: task.subtopicSlug } : {}),
        ...(task.categoryId ? { categoryId: task.categoryId } : {}),
      });
      return draft ? [draft] : [];
    },
  };
}
