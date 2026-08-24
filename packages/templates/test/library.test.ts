import { describe, expect, it } from 'vitest';
import { TEMPLATES, validateLibrary } from '../src/library/index';

describe('template library', () => {
  it('is structurally valid', () => {
    expect(validateLibrary()).toEqual([]);
  });

  it('carries no LIMIT — the connector owns paging', () => {
    // Comments stripped first: a comment about the connector's LIMIT is not one.
    const stripped = (q: string) => q.replace(/#[^\n]*/g, '');
    for (const t of TEMPLATES) {
      expect(/\bLIMIT\b/i.test(stripped(t.query)), `${t.id}`).toBe(false);
    }
  });

  it('binds Hindi labels separately rather than through the label service fallback', () => {
    for (const t of TEMPLATES.filter((x) => x.sourceId === 'wikidata-sparql')) {
      expect(t.query, `${t.id}`).not.toContain('wikibase:label');
      expect(t.query, `${t.id}`).toMatch(/LANG\(\?\w+LabelHi\) = "hi"/);
    }
  });

  it('gives every scoped template the {{SCOPE}} token its connector substitutes', () => {
    for (const t of TEMPLATES.filter((x) => x.scopeVar)) {
      expect(t.query, `${t.id}`).toContain('{{SCOPE}}');
    }
  });

  it('attaches every template to at least one subtopic', () => {
    for (const t of TEMPLATES) expect(t.subtopics.length, t.id).toBeGreaterThan(0);
  });
});

/**
 * The quality gate rejects an English body outside 40–120 words, which means a
 * short phrasing variant fails only for the rows that happen to select it —
 * intermittently, and long after the template was written. One World Bank
 * leader fact was rejected this way in a live run. Checking the variants
 * directly turns that into a build-time failure.
 */
describe('body length, measured on the patterns themselves', () => {
  const words = (s: string) =>
    s.replace(/\{[^}]*\}/g, 'x')      // a placeholder stands in for one word
      .replace(/\$\{[^}]*\}/g, 'x')
      .trim().split(/\s+/).filter(Boolean).length;

  it('keeps every English body variant clear of the 40-word floor', () => {
    const short: string[] = [];
    for (const t of TEMPLATES) {
      for (const p of t.body.en) {
        // A placeholder can expand to several words, so allow a small margin
        // below 40 rather than demanding it here.
        if (words(p) < 42) short.push(`${t.id}: ${words(p)} words — "${p.slice(0, 50)}..."`);
      }
    }
    expect(short).toEqual([]);
  });

  it('keeps every English body variant under the 120-word ceiling', () => {
    const long: string[] = [];
    for (const t of TEMPLATES) {
      for (const p of t.body.en) if (words(p) > 118) long.push(`${t.id}: ${words(p)} words`);
    }
    expect(long).toEqual([]);
  });
});

/**
 * Every placeholder in a pattern must be a binding the template declares.
 *
 * An undeclared one — `{rankMinusOne}` slipped into two variants of the extremes
 * template — does not fail loudly. `rowIsComplete` never sees it, the renderer
 * throws `unbound`, English rendering is fatal, and the row is silently dropped.
 * With deterministic variant selection that quietly loses a fixed fraction of
 * every result set.
 */
describe('placeholders resolve to declared bindings', () => {
  const KNOWN_FORMATTERS = new Set(['year', 'long', 'monthyear', 'big', 'num', 'ord', 'ordobl', 'qty']);

  it('references no binding the template does not declare', () => {
    const unknown: string[] = [];
    for (const t of TEMPLATES) {
      const declared = new Set([...t.requires, ...(t.entityVars ?? [])]);
      // Bindings a connector adds are declared by being used in the query text.
      const inQuery = new Set([...t.query.matchAll(/\?(\w+)/g)].map((m) => m[1]!));
      for (const pattern of [...t.hook.en, ...t.hook.hi, ...t.body.en, ...t.body.hi]) {
        for (const m of pattern.matchAll(/\{(\w+)(?:\|[\w:.]+)?\}/g)) {
          const name = m[1]!;
          if (declared.has(name) || inQuery.has(name)) continue;
          // rank and total are attached by the connector for ranked templates.
          if (t.params?.rankBy && (name === 'rank' || name === 'total')) continue;
          unknown.push(`${t.id}: {${name}}`);
        }
      }
    }
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('uses only formatters the renderer implements', () => {
    const bad: string[] = [];
    for (const t of TEMPLATES) {
      for (const pattern of [...t.hook.en, ...t.hook.hi, ...t.body.en, ...t.body.hi]) {
        for (const m of pattern.matchAll(/\{\w+\|([\w]+)(?::[\w.]+)?\}/g)) {
          if (!KNOWN_FORMATTERS.has(m[1]!)) bad.push(`${t.id}: |${m[1]}`);
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
