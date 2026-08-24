/**
 * Checks every QID in the taxonomy against live Wikidata.
 *
 * A wrong QID does not fail loudly — it silently makes a connector return zero
 * rows, or worse, rows about the wrong thing. Catching that here is much cheaper
 * than noticing it as a thin subtopic three phases later.
 *
 * Run: pnpm --filter @sachmuch/db exec tsx scripts/validate-qids.ts [--fix]
 * With --fix, QIDs that do not resolve are stripped from the taxonomy files.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_AGENT } from './_ua';

const DIR = new URL('../src/taxonomy/', import.meta.url).pathname;

const FIX = process.argv.includes('--fix');

interface Ref { file: string; slug: string; name: string; qid: string }

function collect(): Ref[] {
  const refs: Ref[] = [];
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort()) {
    const src = readFileSync(join(DIR, file), 'utf8');
    for (const line of src.split('\n')) {
      const slug = /\{\s*slug:\s*'([^']+)'/.exec(line)?.[1];
      const name = /\ben:\s*'([^']+)'/.exec(line)?.[1] ?? '';
      const qidsBlock = /qids:\s*\[([^\]]*)\]/.exec(line)?.[1];
      if (!slug || !qidsBlock) continue;
      for (const m of qidsBlock.matchAll(/'(Q\d+)'/g)) {
        refs.push({ file, slug, name, qid: m[1]! });
      }
    }
  }
  return refs;
}

async function labelsFor(qids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions' +
      `&languages=en&ids=${batch.join('|')}`;
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const json = (await res.json()) as {
      entities?: Record<string, { missing?: string; labels?: { en?: { value: string } } }>;
    };
    for (const qid of batch) {
      const e = json.entities?.[qid];
      out.set(qid, !e || e.missing !== undefined ? null : (e.labels?.en?.value ?? ''));
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

/** Loose word overlap — catches "this QID is a completely different thing". */
function looksRelated(subtopic: string, label: string): boolean {
  const norm = (s: string) =>
    new Set(
      s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter((w) => w.length > 3 && !['the', 'and', 'of', 'in', 'for', 'with'].includes(w)),
    );
  const a = norm(subtopic);
  const b = norm(label);
  if (a.size === 0 || b.size === 0) return true;
  for (const w of a) if (b.has(w)) return true;
  for (const w of b) if (a.has(w)) return true;
  return false;
}

const refs = collect();
const unique = [...new Set(refs.map((r) => r.qid))];
console.log(`checking ${unique.length} unique QIDs across ${refs.length} references`);

const labels = await labelsFor(unique);
const missing: Ref[] = [];
const suspicious: (Ref & { label: string })[] = [];

for (const r of refs) {
  const label = labels.get(r.qid);
  if (label === null) missing.push(r);
  else if (label && !looksRelated(r.name, label)) suspicious.push({ ...r, label });
}

console.log(`\nDEAD (QID does not exist): ${missing.length}`);
for (const r of missing) console.log(`  ${r.file} ${r.slug} -> ${r.qid}`);

console.log(`\nSUSPICIOUS (resolves, but the label looks unrelated): ${suspicious.length}`);
for (const r of suspicious) console.log(`  ${r.file} ${r.slug} "${r.name}" -> ${r.qid} = "${r.label}"`);

console.log(`\nOK: ${refs.length - missing.length - suspicious.length} / ${refs.length}`);

if (FIX && missing.length > 0) {
  const byFile = new Map<string, Set<string>>();
  for (const r of missing) {
    if (!byFile.has(r.file)) byFile.set(r.file, new Set());
    byFile.get(r.file)!.add(r.qid);
  }
  for (const [file, qids] of byFile) {
    let src = readFileSync(join(DIR, file), 'utf8');
    for (const q of qids) {
      src = src.replace(new RegExp(`'${q}',\\s*`, 'g'), '').replace(new RegExp(`,?\\s*'${q}'`, 'g'), '');
    }
    // An emptied qids array is noise; drop the field entirely.
    src = src.replace(/qids:\s*\[\s*\],\s*/g, '');
    writeFileSync(join(DIR, file), src, 'utf8');
    console.log(`fixed ${file}: removed ${qids.size} dead QIDs`);
  }
}

if (missing.length > 0) process.exitCode = 1;
