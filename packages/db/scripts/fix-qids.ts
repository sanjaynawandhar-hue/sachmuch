/**
 * One pass over the taxonomy that leaves every QID either VERIFIED or absent.
 *
 * Why this exists: hand-written QIDs are unreliable. A validation run over the
 * first 449 found 5 dead and ~100 pointing at the wrong entity — Pavlov at a
 * German village, Magna Carta at a star, UPI at a railway station. The failure
 * is silent: a scoped SPARQL template with a wrong anchor returns zero rows or
 * rows about something else entirely.
 *
 * So: keep a QID only when the live entity's label or aliases actually relate to
 * the subtopic; otherwise search for a replacement; otherwise remove it. No QID
 * is a fine outcome — the subtopic still drives keyword-based connectors.
 *
 * Run: pnpm --filter @sachmuch/db exec tsx scripts/fix-qids.ts [--write]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_AGENT } from './_ua';

const DIR = new URL('../src/taxonomy/', import.meta.url).pathname;

const WRITE = process.argv.includes('--write');

const STOP = new Set([
  'the', 'and', 'of', 'in', 'for', 'with', 'a', 'an', 'to', 'how', 'why', 'what',
  'was', 'were', 'is', 'are', 'that', 'its', 'from', 'on', 'at', 'by', 'first',
]);

function tokens(s: string): Set<string> {
  return new Set(
    s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter((w) => w && !STOP.has(w))
      .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}
const norm = (s: string) => [...tokens(s)].sort().join(' ');

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return hit / (a.size + b.size - hit);
}

/** Any shared distinctive word between the subtopic's vocabulary and the entity's. */
function related(subtopic: string, keywords: string[], label: string, aliases: string[]): boolean {
  const mine = tokens([subtopic, ...keywords].join(' '));
  const theirs = tokens([label, ...aliases].join(' '));
  for (const w of mine) if (theirs.has(w)) return true;
  return false;
}

const JUNK_DESC =
  /\b(family name|given name|surname|disambiguation|Wikimedia (list|category|template|disambiguation)|name of)\b/i;

interface Entity { label: string; aliases: string[]; desc: string; missing: boolean }

async function getEntities(qids: string[]): Promise<Map<string, Entity>> {
  const out = new Map<string, Entity>();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json' +
      `&props=labels|aliases|descriptions&languages=en&ids=${batch.join('|')}`;
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const json = (await res.json()) as {
      entities?: Record<string, {
        missing?: string;
        labels?: { en?: { value: string } };
        descriptions?: { en?: { value: string } };
        aliases?: { en?: { value: string }[] };
      }>;
    };
    for (const q of batch) {
      const e = json.entities?.[q];
      out.set(q, {
        missing: !e || e.missing !== undefined,
        label: e?.labels?.en?.value ?? '',
        desc: e?.descriptions?.en?.value ?? '',
        aliases: (e?.aliases?.en ?? []).map((a) => a.value),
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

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
const ALIAS_ACCEPT = 0.95;
/** Single short acronyms are the most dangerous search terms: "UPI" is a village. */
const usableKeyword = (k: string) => k.trim().split(/\s+/).length >= 2 || k.trim().length >= 6;

async function resolve(name: string, keywords: string[]): Promise<Candidate | null> {
  const attempts = [name, name.replace(/^(The|A|An)\s+/i, ''), ...keywords.filter(usableKeyword)];
  const tried = new Set<string>();

  for (const term of attempts) {
    if (!term || tried.has(term.toLowerCase())) continue;
    tried.add(term.toLowerCase());

    const cands = await search(term);
    await new Promise((r) => setTimeout(r, 160));
    const t = tokens(term);
    const wanted = norm(term);

    const exact = cands.find((c) => norm(c.label) === wanted);
    if (exact) return exact;

    for (const c of cands) {
      const byLabel = jaccard(t, tokens(c.label));
      const byAlias = Math.max(0, ...c.aliases.map((a) => jaccard(t, tokens(a))));
      if (byLabel >= LABEL_ACCEPT || byAlias >= ALIAS_ACCEPT) return c;
    }
  }
  return null;
}

interface Entry { file: string; line: number; slug: string; name: string; keywords: string[]; qid?: string }

const LINE = /\{\s*slug:\s*'([^']+)',\s*en:\s*'([^']+)'/;
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort();
const source = new Map<string, string[]>();
const entries: Entry[] = [];

for (const file of files) {
  const lines = readFileSync(join(DIR, file), 'utf8').split('\n');
  source.set(file, lines);
  lines.forEach((line, i) => {
    const m = LINE.exec(line);
    if (!m) return;
    entries.push({
      file, line: i, slug: m[1]!, name: m[2]!,
      keywords: [...(line.match(/keywords:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1]!),
      ...(( /qids:\s*\[\s*'(Q\d+)'/.exec(line)?.[1] ) ? { qid: /qids:\s*\[\s*'(Q\d+)'/.exec(line)![1]! } : {}),
    });
  });
}

console.log(`${entries.length} subtopics across ${files.length} categories`);

const existing = [...new Set(entries.filter((e) => e.qid).map((e) => e.qid!))];
console.log(`verifying ${existing.length} existing QIDs...`);
const known = await getEntities(existing);

const keep: Entry[] = [];
const needsWork: Entry[] = [];
for (const e of entries) {
  if (!e.qid) { needsWork.push(e); continue; }
  const ent = known.get(e.qid);
  if (!ent || ent.missing || JUNK_DESC.test(ent.desc)) { needsWork.push(e); continue; }
  if (related(e.name, e.keywords, ent.label, ent.aliases)) keep.push(e);
  else needsWork.push(e);
}

console.log(`kept as verified: ${keep.length}`);
console.log(`to resolve:       ${needsWork.length}`);

let replaced = 0, added = 0, removed = 0;
let done = 0;
for (const e of needsWork) {
  const hit = await resolve(e.name, e.keywords);
  const lines = source.get(e.file)!;
  const line = lines[e.line]!;

  if (hit) {
    if (e.qid) replaced++; else added++;
    lines[e.line] = e.qid
      ? line.replace(/qids:\s*\[[^\]]*\]/, `qids: ['${hit.id}']`)
      : line.replace(/(en:\s*'[^']*',\s*hi:\s*'[^']*',\s*)/, `$1qids: ['${hit.id}'], `);
  } else if (e.qid) {
    removed++;
    lines[e.line] = line.replace(/qids:\s*\[[^\]]*\],\s*/, '');
  }

  if (++done % 100 === 0) console.log(`  ...${done}/${needsWork.length}`);
}

if (WRITE) {
  for (const [file, lines] of source) writeFileSync(join(DIR, file), lines.join('\n'), 'utf8');
}

console.log(`\nverified and kept:   ${keep.length}`);
console.log(`replaced with a hit: ${replaced}`);
console.log(`newly added:         ${added}`);
console.log(`removed (no match):  ${removed}`);
console.log(`left without a QID:  ${entries.length - keep.length - replaced - added}`);
console.log(WRITE ? '\nwritten.' : '\n(dry run — pass --write to apply)');
