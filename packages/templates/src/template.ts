import { renderRow, fnv1a } from './render';
import type { FactDraft, Row, TemplateDef } from './types';

export interface TemplateProblem {
  templateId: string;
  problem: string;
}

/**
 * Structural checks on a template itself, run at load time. A template with one
 * phrasing turns 800 rows into 800 copies of one fact, so the 3–5 rule is a
 * hard gate rather than advice.
 */
export function validateTemplate(t: TemplateDef): TemplateProblem[] {
  const p: TemplateProblem[] = [];
  const add = (problem: string) => p.push({ templateId: t.id, problem });

  for (const [side, pat] of [['hook', t.hook], ['body', t.body]] as const) {
    for (const lang of ['en', 'hi'] as const) {
      const list = pat[lang];
      if (list.length < 3 || list.length > 5) {
        add(`${side}.${lang} must hold 3–5 phrasings, found ${list.length}`);
      }
      if (new Set(list).size !== list.length) add(`${side}.${lang} has duplicate phrasings`);
      for (const s of list) {
        if (!s.trim()) add(`${side}.${lang} has an empty phrasing`);
        if (/\{\s*\}/.test(s)) add(`${side}.${lang} has an empty placeholder`);
      }
    }
  }

  if (!t.significance) {
    add('template must declare a significance — a row-level fact is not a fact');
  }
  // A superlative or a current-holder goes out of date; §6 requires an expiry.
  const perishable: string[] = ['superlative', 'extreme', 'only'];
  if (perishable.includes(t.significance) && !t.decays) {
    add(`significance "${t.significance}" describes a current standing, so it must decay`);
  }
  if (t.decays && !t.validForDays) add('decays: true requires validForDays');
  if (!t.decays && t.validForDays) add('validForDays set on a non-decaying template');
  if (t.difficulty < 1 || t.difficulty > 5) add('difficulty must be 1–5');
  if (t.minRows < 1) add('minRows must be at least 1');
  if (t.subtopics.length === 0) add('template is attached to no subtopic');
  if (!t.requires.includes(t.sourceFrom)) {
    add(`sourceFrom "${t.sourceFrom}" must also be listed in requires`);
  }
  return p;
}

/** A row is usable only if every required binding carries real content. */
export function rowIsComplete(t: TemplateDef, row: Row): boolean {
  return t.requires.every((v) => {
    const b = row[v];
    if (!b) return false;
    return Boolean(b.en?.trim() || b.number !== undefined || b.date);
  });
}

/**
 * Stable per-row identity.
 *
 * Every binding contributes, not just the entity QIDs: two awards to the same
 * person in different years are different rows, and keying on entities alone
 * would silently merge them.
 */
export function rowKeyFor(t: TemplateDef, row: Row): string {
  const parts = Object.entries(row)
    .map(([k, b]) => `${k}=${b.qid ?? ''}:${b.en ?? ''}:${b.number ?? ''}:${b.date ?? ''}`)
    .sort();
  return `${t.id}|${fnv1a(parts.join('|')).toString(36)}`;
}

export interface DraftOptions {
  subtopicSlug?: string;
  /**
   * The subtopic's own category, which wins over the template's.
   *
   * One award template legitimately produces Bollywood facts and Hollywood
   * facts; filing them all under the template's category would put Scorsese in
   * the Bollywood rail. A fact belongs to the category its SUBTOPIC belongs to,
   * and the template's categoryId is only the fallback for unscoped templates.
   */
  categoryId?: number;
  /** Overrides the URL held in the sourceFrom binding, when a connector knows better. */
  sourceUrl?: string;
  now?: Date;
}

/** Turn one row into a draft, or null when the row cannot make an English fact. */
export function draftFromRow(t: TemplateDef, row: Row, opts: DraftOptions = {}): FactDraft | null {
  if (!rowIsComplete(t, row)) return null;

  const sourceUrl = opts.sourceUrl ?? row[t.sourceFrom]?.en;
  if (!sourceUrl || !/^https?:\/\//.test(sourceUrl)) return null;

  const rowKey = rowKeyFor(t, row);
  let rendered;
  try {
    rendered = renderRow(t, row, rowKey);
  } catch {
    return null; // English failed; the row is unusable
  }

  const entityQids = (t.entityVars ?? [])
    .map((v) => row[v]?.qid)
    .filter((q): q is string => Boolean(q));

  const now = opts.now ?? new Date();
  const validUntil =
    t.decays && t.validForDays
      ? new Date(now.getTime() + t.validForDays * 86_400_000)
      : undefined;

  return {
    templateId: t.id,
    sourceId: t.sourceId,
    categoryId: opts.categoryId ?? t.categoryId,
    ...(opts.subtopicSlug ? { subtopicSlug: opts.subtopicSlug } : {}),
    hookEn: rendered.hookEn,
    bodyEn: rendered.bodyEn,
    ...(rendered.hookHi ? { hookHi: rendered.hookHi } : {}),
    ...(rendered.bodyHi ? { bodyHi: rendered.bodyHi } : {}),
    hiMissing: !rendered.hookHi,
    ...(rendered.hiSkipReason ? { hiSkipReason: rendered.hiSkipReason } : {}),
    sourceUrl,
    difficulty: t.difficulty,
    ...(validUntil ? { validUntil } : {}),
    entityQids,
    rowKey,
  };
}
