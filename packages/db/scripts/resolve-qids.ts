/**
 * Resolves taxonomy QIDs by LOOKUP instead of by memory.
 *
 * Written after validate-qids found that only 55 of 97 hand-written QIDs were
 * correct, and the wrong ones were wrong in ways no reviewer catches by eye —
 * Pavlov pointed at a German village, Magna Carta at a star. A wrong QID
 * silently yields zero rows, or rows about the wrong thing.
 *
 * Having NO QID is fine: a scoped template skips that subtopic and its keywords
 * still drive the non-SPARQL connectors. Fewer correct anchors beat more wrong
 * ones, so the acceptance rules below are deliberately strict.
 *
 * Run: pnpm --filter @sachmuch/db exec tsx scripts/resolve-qids.ts [--write]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_AGENT } from './_ua';

const DIR = new URL('../src/taxonomy/', import.meta.url).pathname;

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

const STOP = new Set([
  'the', 'and', 'of', 'in', 'for', 'with', 'a', 'an', 'to', 'how', 'why', 'what',
  'was', 'were', 'is', 'are', 'that', 'its', 'from', 'on', 'at', 'by',
]);

/** Light stemming so "mutual funds" matches the item labelled "mutual fund". */
function tokens(s: string): Set<string> {
  return new Set(
    s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}

const normLabel = (s: string) => [...tokens(s)].sort().join(' ');

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return hit / (a.size + b.size - hit);
}

/**
 * Wikidata carries metadata items whose labels match anything — surnames,
 * disambiguation pages, list articles. "Ambedkar" resolves to a family-name
 * item long before it resolves to the person.
 */
const JUNK_DESC = /\b(family name|given name|surname|disambiguation|Wikimedia (list|category|template|disambiguation)|name of)\b/i;

interface Candidate { id: string; label: string; desc: string; aliases: string[] }

async function search(term: string): Promise<Candidate[]> {
  const url =
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en' +
    `&uselang=en&type=item&limit=8&search=${encodeURIComponent(term)}`;
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    search?: { id: string; label?: string; description?: string; aliases?: string[] }[];
  };
  return (json.search ?? [])
    .map((s) => ({ id: s.id, label: s.label ?? '', desc: s.description ?? '', aliases: s.aliases ?? [] }))
    .filter((c) => !JUNK_DESC.test(c.desc));
}

const LABEL_ACCEPT = 0.62;
/** An alias only counts when it matches the term outright. */
const ALIAS_ACCEPT = 0.95;

/** Single short acronyms are the most dangerous search terms: "UPI" is a village. */
const usableKeyword = (k: string) => k.trim().split(/\s+/).length >= 2 || k.trim().length >= 6;

interface Hit { id: string; label: string; via: string }

async function resolveOne(name: string, keywords: string[]): Promise<Hit | null> {
  const attempts = [name, name.replace(/^(The|A|An)\s+/i, ''), ...keywords.filter(usableKeyword)];
  const tried = new Set<string>();

  for (const term of attempts) {
    if (!term || tried.has(term.toLowerCase())) continue;
    tried.add(term.toLowerCase());

    const cands = await search(term);
    await new Promise((r) => setTimeout(r, 170));
    const t = tokens(term);
    const wanted = normLabel(term);

    // An exact label match wins outright, wherever it sits in the ranking.
    const exact = cands.find((c) => normLabel(c.label) === wanted);
    if (exact) return { id: exact.id, label: exact.label, via: term };

    // Otherwise take the highest-ranked candidate that clears the bar.
    for (const c of cands) {
      const byLabel = jaccard(t, tokens(c.label));
      const byAlias = Math.max(0, ...c.aliases.map((a) => jaccard(t, tokens(a))));
      if (byLabel >= LABEL_ACCEPT || byAlias >= ALIAS_ACCEPT) {
        return { id: c.id, label: c.label, via: term };
      }
    }
  }
  return null;
}

const LINE = /\{\s*slug:\s*'([^']+)',\s*en:\s*'([^']+)'/;

let scanned = 0, resolved = 0, cleared = 0, none = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort()) {
  const path = join(DIR, file);
  const lines = readFileSync(path, 'utf8').split('\n');
  let changed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = LINE.exec(line);
    if (!m) continue;
    scanned++;
    const name = m[2]!;
    const keywords = [...(line.match(/keywords:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)]
      .map((x) => x[1]!);

    const hit = await resolveOne(name, keywords);
    const hadQids = /qids:\s*\[/.test(line);

    if (hit) {
      resolved++;
      if (VERBOSE) console.log(`  ✓ ${m[1]} -> ${hit.id} "${hit.label}"`);
      const next = hadQids
        ? line.replace(/qids:\s*\[[^\]]*\]/, `qids: ['${hit.id}']`)
        : line.replace(/(en:\s*'[^']*',\s*hi:\s*'[^']*',\s*)/, `$1qids: ['${hit.id}'], `);
      if (next !== line) { lines[i] = next; changed++; }
    } else if (hadQids) {
      cleared++;
      if (VERBOSE) console.log(`  ✗ ${m[1]} -> unverifiable, QID removed`);
      lines[i] = line.replace(/qids:\s*\[[^\]]*\],\s*/, '');
      changed++;
    } else {
      none++;
    }
  }

  if (WRITE && changed > 0) writeFileSync(path, lines.join('\n'), 'utf8');
  console.log(`${file}: ${changed} lines updated`);
}

console.log(`\nsubtopics scanned:          ${scanned}`);
console.log(`resolved to a verified QID: ${resolved}`);
console.log(`unverifiable QIDs removed:  ${cleared}`);
console.log(`left without a QID:         ${none}`);
if (!WRITE) console.log('\n(dry run — pass --write to apply)');
