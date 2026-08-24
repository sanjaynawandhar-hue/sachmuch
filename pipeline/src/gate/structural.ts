import type { FactDraft } from '@sachmuch/templates';

export interface GateFinding {
  rule: string;
  detail: string;
}

const HOOK_MAX = 150;
const BODY_MIN_WORDS = 40;
const BODY_MAX_WORDS = 120;

/** Devanagari words are not space-delimited any differently, but the count runs long. */
function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * §7.1 — structural checks. All deterministic, no model, no network.
 * These run first because they are free and catch template bugs, not data bugs.
 */
export function checkStructure(d: FactDraft): GateFinding[] {
  const f: GateFinding[] = [];
  const push = (rule: string, detail: string) => f.push({ rule, detail });

  if (!d.hookEn.trim()) push('structural.hook_empty', 'English hook is empty');
  if (!d.bodyEn.trim()) push('structural.body_empty', 'English body is empty');

  if (d.hookEn.length > HOOK_MAX) {
    push('structural.hook_too_long', `English hook is ${d.hookEn.length} chars, max ${HOOK_MAX}`);
  }
  if (d.hookHi && d.hookHi.length > HOOK_MAX) {
    push('structural.hook_too_long', `Hindi hook is ${d.hookHi.length} chars, max ${HOOK_MAX}`);
  }

  const w = wordCount(d.bodyEn);
  if (w < BODY_MIN_WORDS || w > BODY_MAX_WORDS) {
    push('structural.body_length', `English body is ${w} words, want ${BODY_MIN_WORDS}–${BODY_MAX_WORDS}`);
  }

  for (const [field, text] of Object.entries({
    hookEn: d.hookEn, bodyEn: d.bodyEn, hookHi: d.hookHi, bodyHi: d.bodyHi,
  })) {
    if (!text) continue;
    if (/[{}]/.test(text)) push('structural.unresolved_placeholder', `${field} still contains braces`);
    // A bare QID or PID means the label service handed back an identifier.
    if (/\b[QP]\d{2,}\b/.test(text)) push('structural.identifier_leak', `${field} contains a raw Wikidata id`);
    if (/\s{2,}/.test(text)) push('structural.double_space', `${field} has doubled whitespace`);
    if (/\s+[.,;:।]/.test(text)) push('structural.space_before_punctuation', `${field} has a space before punctuation`);
    if (/\bnull\b|\bundefined\b|\bNaN\b/.test(text)) push('structural.null_leak', `${field} contains a null-ish literal`);
    // Wikidata's own disambiguators — "(2006 film)", "(2006 फ़िल्म)" — are
    // editorial scaffolding for its namespace and read as a bug on a card.
    if (/[(（]\s*(?:\d{4}\s*(?:film|movie|फ़िल्म|फिल्म)|disambiguation)[^)）]*[)）]/i.test(text)) {
      push('structural.disambiguator_leak', `${field} contains a Wikidata disambiguator`);
    }
  }

  // §2.5 — Hindi is complete or it is absent. A half-Hindi fact is the failure
  // mode the constraint in the schema exists to prevent; catch it earlier here.
  if (!d.hiMissing && (!d.hookHi?.trim() || !d.bodyHi?.trim())) {
    push('structural.partial_hindi', 'fact claims Hindi but one side is empty');
  }
  if (d.hiMissing && (d.hookHi || d.bodyHi)) {
    push('structural.hindi_flag_mismatch', 'fact is flagged hi_missing but carries Hindi');
  }

  if (!/^https?:\/\//.test(d.sourceUrl)) push('structural.bad_source_url', d.sourceUrl);
  if (d.difficulty < 1 || d.difficulty > 5) push('structural.difficulty', String(d.difficulty));

  return f;
}
