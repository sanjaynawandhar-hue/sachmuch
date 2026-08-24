/**
 * Final strictness pass over the taxonomy anchors.
 *
 * fix-qids resolves a QID by searching, and its keyword fallback occasionally
 * lands somewhere plausible-looking but wrong: "India's first Test, 1932" has
 * the keyword "Lord's", which resolves happily to the Lord's Prayer. A scoped
 * SPARQL template anchored there would file religious-text facts under Cricket.
 *
 * So an anchor survives only if it is defensible on its face:
 *   - the entity's label or aliases share a distinctive word with the SUBTOPIC
 *     NAME (not merely with one of its keywords), or
 *   - the entity's label exactly equals one of the keywords, which means the
 *     taxonomy deliberately named that entity.
 *
 * Everything else is removed. Losing an anchor costs us a scoped template on
 * that subtopic; keeping a wrong one costs us wrong facts.
 *
 * Run: pnpm --filter @sachmuch/db exec tsx scripts/audit-qids.ts [--write]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_AGENT } from './_ua';

const DIR = new URL('../src/taxonomy/', import.meta.url).pathname;

const WRITE = process.argv.includes('--write');

const STOP = new Set([
  'the', 'and', 'of', 'in', 'for', 'with', 'a', 'an', 'to', 'how', 'why', 'what',
  'was', 'were', 'is', 'are', 'that', 'its', 'from', 'on', 'at', 'by', 'first',
  'new', 'great', 'world', 'made', 'making', 'began', 'begin', 'story', 'history', 'rise',
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

const LINE = /\{\s*slug:\s*'([^']+)',\s*en:\s*'([^']+)'/;
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort();
const source = new Map<string, string[]>();

interface Entry { file: string; line: number; slug: string; name: string; keywords: string[]; qid: string }
const entries: Entry[] = [];

for (const file of files) {
  const lines = readFileSync(join(DIR, file), 'utf8').split('\n');
  source.set(file, lines);
  lines.forEach((line, i) => {
    const m = LINE.exec(line);
    const qid = /qids:\s*\[\s*'(Q\d+)'/.exec(line)?.[1];
    if (!m || !qid) return;
    entries.push({
      file, line: i, slug: m[1]!, name: m[2]!, qid,
      keywords: [...(line.match(/keywords:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1]!),
    });
  });
}

console.log(`auditing ${entries.length} anchors`);
const known = await getEntities([...new Set(entries.map((e) => e.qid))]);

let kept = 0, dropped = 0;
const examples: string[] = [];

for (const e of entries) {
  const ent = known.get(e.qid);
  const entityWords = ent ? tokens([ent.label, ...ent.aliases].join(' ')) : new Set<string>();
  const nameWords = tokens(e.name);

  let sharesWithName = false;
  for (const w of nameWords) if (entityWords.has(w)) { sharesWithName = true; break; }

  const namedByKeyword =
    !!ent && e.keywords.some((k) => norm(k) === norm(ent.label) && norm(k).length > 0);

  if (sharesWithName || namedByKeyword) { kept++; continue; }

  dropped++;
  if (examples.length < 12) examples.push(`  ${e.slug} "${e.name}" -> ${e.qid} "${ent?.label ?? '?'}"`);
  const lines = source.get(e.file)!;
  lines[e.line] = lines[e.line]!.replace(/qids:\s*\[[^\]]*\],\s*/, '');
}

if (WRITE) for (const [file, lines] of source) writeFileSync(join(DIR, file), lines.join('\n'), 'utf8');

console.log(`\nkept:    ${kept}`);
console.log(`dropped: ${dropped}`);
console.log('\nexamples of what was dropped:');
for (const x of examples) console.log(x);
console.log(WRITE ? '\nwritten.' : '\n(dry run — pass --write to apply)');
