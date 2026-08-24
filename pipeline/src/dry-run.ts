/**
 * Runs the full ingestion path with no database: discover -> fetch -> map ->
 * quality gate -> in-batch dedupe, writing results to a JSON file.
 *
 * This exists because the pipeline can be proved correct before Supabase
 * credentials exist, and because it is the fastest way to see a new template's
 * real yield and Hindi coverage before committing it.
 *
 * Run: pnpm --filter @sachmuch/pipeline exec tsx src/dry-run.ts [--pages 2] [--out report.json]
 */
import { writeFileSync } from 'node:fs';
import type { FactDraft } from '@sachmuch/templates';
import { TEMPLATES } from '@sachmuch/templates/library';
import { warmCountryIndex } from '@sachmuch/connectors';
import { buildConnectors } from './registry';
import { dedupeBatch } from './gate/dedupe';
import { runGate } from './gate/index';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};

const MAX_PAGES = Number(arg('pages', '1'));
const OUT = arg('out', 'dry-run.json');
/** The source check is the only network-expensive rule; off by default here. */
const OFFLINE_SOURCE_CHECK = !process.argv.includes('--check-sources');

interface TemplateReport {
  templateId: string;
  tasks: number;
  rows: number;
  drafts: number;
  bilingual: number;
  hindiCoverage: number;
  passed: number;
  duplicates: number;
  rejectReasons: Record<string, number>;
  hiSkipReasons: Record<string, number>;
  /**
   * Hindi coverage varies enormously BY SUBTOPIC, not by template: the same
   * award template runs near 100% on Filmfare and near zero on the Emmys,
   * because Wikidata simply has no Hindi labels for American television
   * categories. A template-level average hides that, so the fix (a narrower
   * query, or accepting an English-only subtopic) is chosen per subtopic.
   */
  bySubtopic: Record<string, { drafts: number; bilingual: number; passed: number }>;
  samples: { en: string; hi: string | null; url: string; quality: number }[];
}

// map() is synchronous by contract, so the ISO3 -> country index has to be
// warm before any World Bank row is mapped.
console.log(`country index: ${await warmCountryIndex()} countries`);

const connectors = buildConnectors();
const reports = new Map<string, TemplateReport>();

const report = (id: string): TemplateReport => {
  let r = reports.get(id);
  if (!r) {
    r = { templateId: id, tasks: 0, rows: 0, drafts: 0, bilingual: 0, hindiCoverage: 0,
          passed: 0, duplicates: 0, rejectReasons: {}, hiSkipReasons: {}, bySubtopic: {}, samples: [] };
    reports.set(id, r);
  }
  return r;
};

for (const connector of connectors) {
  const tasks = await connector.discover();
  console.log(`${connector.id}: ${tasks.length} tasks`);

  for (const task of tasks) {
    const id = task.templateId ?? connector.id;
    const r = report(id);
    r.tasks++;

    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      let rows: unknown[];
      try {
        const res = await connector.fetch(task, cursor);
        rows = res.rows;
        cursor = res.nextCursor;
      } catch (e) {
        console.warn(`  ${task.key}: ${(e as Error).message}`);
        break;
      }
      r.rows += rows.length;

      const drafts: FactDraft[] = rows.flatMap((row) => connector.map(row, task));
      const { kept, dropped } = dedupeBatch(drafts);
      r.duplicates += dropped.length;

      const slot = (r.bySubtopic[task.subtopicSlug ?? '(unscoped)'] ??= {
        drafts: 0, bilingual: 0, passed: 0,
      });

      for (const d of kept) {
        r.drafts++;
        slot.drafts++;
        if (d.hiMissing) {
          const reason = d.hiSkipReason ?? 'unknown';
          r.hiSkipReasons[reason] = (r.hiSkipReasons[reason] ?? 0) + 1;
        } else {
          r.bilingual++;
          slot.bilingual++;
        }

        const gate = await runGate(d, {
          sourceId: connector.id,
          rateLimitRpm: connector.rateLimitRpm,
          ...(OFFLINE_SOURCE_CHECK ? { offline: true } : {}),
        });

        if (gate.pass) {
          r.passed++;
          slot.passed++;
          if (r.samples.length < 3) {
            r.samples.push({ en: d.hookEn, hi: d.hookHi ?? null, url: d.sourceUrl, quality: gate.quality });
          }
        } else {
          for (const f of gate.findings) {
            r.rejectReasons[f.rule] = (r.rejectReasons[f.rule] ?? 0) + 1;
          }
        }
      }
      if (!cursor) break;
    }
  }
}

const all = [...reports.values()];
for (const r of all) r.hindiCoverage = r.drafts > 0 ? r.bilingual / r.drafts : 0;

const totals = {
  templatesInLibrary: TEMPLATES.length,
  templatesRun: all.length,
  rows: all.reduce((n, r) => n + r.rows, 0),
  drafts: all.reduce((n, r) => n + r.drafts, 0),
  passed: all.reduce((n, r) => n + r.passed, 0),
  bilingual: all.reduce((n, r) => n + r.bilingual, 0),
  duplicates: all.reduce((n, r) => n + r.duplicates, 0),
};

writeFileSync(OUT, JSON.stringify({ totals, templates: all }, null, 2), 'utf8');

console.log('\n--- dry run ---');
console.log(`templates in library: ${totals.templatesInLibrary}, run: ${totals.templatesRun}`);
console.log(`rows fetched:  ${totals.rows}`);
console.log(`drafts:        ${totals.drafts}`);
console.log(`gate passed:   ${totals.passed}`);
console.log(`bilingual:     ${totals.bilingual}` +
  (totals.drafts ? ` (${((100 * totals.bilingual) / totals.drafts).toFixed(0)}% Hindi coverage)` : ''));
console.log(`duplicates:    ${totals.duplicates}`);
console.log('\nper template:');
for (const r of all.sort((a, b) => b.passed - a.passed)) {
  console.log(
    `  ${r.templateId.padEnd(22)} rows=${String(r.rows).padStart(5)} ` +
    `pass=${String(r.passed).padStart(5)} hi=${(100 * r.hindiCoverage).toFixed(0).padStart(3)}%` +
    (Object.keys(r.rejectReasons).length ? `  top-reject=${Object.entries(r.rejectReasons).sort((a,b)=>b[1]-a[1])[0]![0]}` : ''),
  );
}
console.log('\nHindi coverage by subtopic (the number that decides whether a query needs changing):');
for (const r of all) {
  for (const [slug, s] of Object.entries(r.bySubtopic).sort((a, b) => b[1].drafts - a[1].drafts)) {
    const pct = s.drafts ? ((100 * s.bilingual) / s.drafts).toFixed(0) : '0';
    console.log(`  ${r.templateId}/${slug.padEnd(24)} drafts=${String(s.drafts).padStart(5)} hi=${pct.padStart(3)}%`);
  }
}
console.log(`\nwrote ${OUT}`);
