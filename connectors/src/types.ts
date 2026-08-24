import type { FactDraft } from '@sachmuch/templates';

export type ConnectorKind = 'sparql' | 'rest' | 'dump' | 'rss';

export type Licence = 'cc0' | 'cc_by' | 'cc_by_sa' | 'public_domain' | 'terms_only';

/** One unit of work. Usually one subtopic, sometimes one calendar day or one template. */
export interface Task {
  /** Stable identity — the jobs table dedupes queued work on it. */
  key: string;
  subtopicSlug?: string;
  categoryId?: number;
  templateId?: string;
  /** Connector-specific payload. */
  params?: Record<string, unknown>;
}

export interface FetchResult {
  rows: unknown[];
  nextCursor?: string;
}

/**
 * Every source in the app is one of these and nothing else in the codebase knows
 * where a fact came from. Adding a source is this file plus one row in `sources`.
 * The interface IS the framework — there is deliberately no plugin machinery
 * wrapped around it.
 */
export interface Connector {
  id: string;
  kind: ConnectorKind;
  /** Publisher name shown on the card. */
  publisher: string;
  homepage: string;
  licence: Licence;
  attributionRequired: boolean;
  attributionText?: string;
  rateLimitRpm: number;
  /** Free-tier keys only. A source that cannot work inside its free tier is out. */
  needsKey: boolean;
  /** Env var holding the key, when needsKey. */
  keyEnvVar?: string;
  schedule: string;

  discover(): Promise<Task[]>;
  fetch(task: Task, cursor?: string): Promise<FetchResult>;
  map(row: unknown, task: Task): FactDraft[];
}

/** Thrown when a source asks us to back off. Pauses that source, not the run. */
export class RateLimited extends Error {
  constructor(readonly retryAfterMs: number, readonly sourceId: string) {
    super(`${sourceId} rate limited, retry in ${retryAfterMs}ms`);
    this.name = 'RateLimited';
  }
}

/** Thrown for a source-side failure that should count toward the health score. */
export class SourceError extends Error {
  constructor(readonly sourceId: string, message: string, readonly status?: number) {
    super(message);
    this.name = 'SourceError';
  }
}
