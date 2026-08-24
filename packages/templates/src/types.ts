import type { Lang } from './format';

export type { Lang };

/** Wikidata P21, normalised. */
export type Gender = 'male' | 'female' | 'other';

/** One variable bound for one row. */
export interface Binding {
  /** English surface form. */
  en?: string;
  /** Hindi surface form — Wikidata's @hi label where one exists. */
  hi?: string;
  number?: number;
  /** ISO 8601, possibly with Wikidata's leading '+'. */
  date?: string;
  /** Present for entity bindings; drives the fact graph and the QID leak check. */
  qid?: string;
  /** Present for person bindings; drives Hindi verb agreement. */
  gender?: Gender;
}

export type Row = Record<string, Binding>;

/** 3–5 alternatives, picked deterministically. One pattern means 800 identical facts. */
export interface Patterns {
  en: string[];
  hi: string[];
}

/**
 * WHY a template's output is worth knowing.
 *
 * This field exists because the first version of the library produced rows, not
 * facts. "Meena Kumari won the Filmfare Award for Best Actress in 1955" is true,
 * sourced and completely uninteresting: somebody wins it every single year, so
 * the statement carries no information beyond a name and a date.
 *
 * A fact earns its place by being DISTINGUISHED among its peers. Every template
 * must declare how, and `validateTemplate` rejects one that cannot.
 */
export type Significance =
  /** Top of some ordering: the most, the highest, the longest. */
  | 'superlative'
  /** A count that stands out: won it ten times, played 200 Tests. */
  | 'record'
  /** The first to do something. */
  | 'first'
  /** The only one, or one of very few. */
  | 'only'
  /** A physical or numeric extreme: hottest, farthest, densest. */
  | 'extreme'
  /** Meaningful only against another quantity: 390 times farther than the Moon. */
  | 'comparison'
  /** An aggregate over a career or a period that no single row shows. */
  | 'aggregate';

export interface TemplateDef {
  id: string;
  /** Why this template's output is worth knowing. Required — see Significance. */
  significance: Significance;
  /** Which source connector feeds it. */
  sourceId: string;
  categoryId: number;
  /** Subtopic slugs this template can fill. */
  subtopics: string[];
  /** The query text. SPARQL for Wikidata templates; an opaque descriptor otherwise. */
  query: string;
  /**
   * Connector-specific settings. The Wikidata connector ignores this; the World
   * Bank connector reads `angle` (which position to render) and `ascending`
   * (whether a low value is the notable end).
   */
  params?: Record<string, unknown>;
  /**
   * When set, the query carries a `{{SCOPE}}` token and the connector fans the
   * template out into one task per subtopic, substituting a VALUES clause of
   * that subtopic's QIDs. This is what lets §9 top up a single thin subtopic
   * instead of re-running an entire template.
   */
  scopeVar?: string;
  hook: Patterns;
  body: Patterns;
  /** Superlatives and current-holders must expire — see §6. */
  decays: boolean;
  /** How long a decaying fact stays valid. */
  validForDays?: number;
  /** Which binding carries the citation URL. */
  sourceFrom: string;
  /** A template yielding fewer rows than this is not worth keeping enabled. */
  minRows: number;
  /** 1 (kids) … 5 (obscure). */
  difficulty: number;
  /** Bindings that must be present and non-empty or the row is dropped entirely. */
  requires: string[];
  /** Entity bindings that become card chips and fact-graph edges. */
  entityVars?: string[];
}

/** What a template produces per row, and what the quality gate consumes. */
export interface FactDraft {
  templateId: string;
  sourceId: string;
  categoryId: number;
  subtopicSlug?: string;
  hookEn: string;
  bodyEn: string;
  hookHi?: string;
  bodyHi?: string;
  hiMissing: boolean;
  /** Why Hindi was withheld, for the per-template coverage report. */
  hiSkipReason?: string;
  sourceUrl: string;
  difficulty: number;
  validUntil?: Date;
  /** QIDs this fact is about. */
  entityQids: string[];
  /** Stable identity for this row, used for dedupe and variant selection. */
  rowKey: string;
}
