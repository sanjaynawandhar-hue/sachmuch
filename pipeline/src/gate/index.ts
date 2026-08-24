import type { FactDraft } from '@sachmuch/templates';
import { checkStructure, type GateFinding } from './structural';
import { checkBlocklist } from './blocklist';
import { factHash } from './dedupe';
import { checkSource, type SourceCheckOptions } from './source-check';

export * from './structural';
export * from './blocklist';
export * from './dedupe';
export * from './source-check';

/**
 * Rules whose failure says nothing about the draft itself.
 *
 * A source that would not answer a HEAD request this minute is a network event,
 * not a defect. Recording it as a permanent rejection is worse than useless:
 * the rejected row occupies the draft's unique hash, so every later run skips
 * the fact silently and it is never reconsidered. Three World Bank facts were
 * lost this way to what turned out to be a momentary blip — all three URLs
 * returned 200 when checked a minute later.
 */
const TRANSIENT_RULES = new Set(['source.unreachable']);

export interface GateResult {
  draft: FactDraft;
  pass: boolean;
  findings: GateFinding[];
  /**
   * True when the draft failed only on transient rules. The caller must NOT
   * persist a rejection for these — leaving the draft unwritten is what lets a
   * later run pick it up.
   */
  retryable: boolean;
  normalizedHash: string;
  /** 0–1, consumed by feed ranking. */
  quality: number;
}

/**
 * Quality is deterministic and explainable — no model anywhere. It starts from
 * a neutral 0.5 and moves on properties we can actually observe.
 */
export function scoreQuality(d: FactDraft): number {
  let q = 0.5;
  if (!d.hiMissing) q += 0.12;              // bilingual facts are worth more to this app
  if (d.entityQids.length > 0) q += 0.08;   // linkable into the fact graph
  if (d.entityQids.length > 1) q += 0.05;
  if (d.sourceUrl.startsWith('https://')) q += 0.03;

  const hookWords = d.hookEn.trim().split(/\s+/).length;
  if (hookWords >= 8 && hookWords <= 22) q += 0.07;  // a readable hook length
  else if (hookWords < 5) q -= 0.1;

  if (d.validUntil) q -= 0.05;              // decaying facts are worth slightly less
  return Math.max(0, Math.min(1, q));
}

/**
 * The full gate. Cheap deterministic rules first, the network check last, so a
 * draft that was never going to publish costs us no requests.
 */
export async function runGate(
  d: FactDraft,
  opts: SourceCheckOptions,
): Promise<GateResult> {
  const findings: GateFinding[] = [...checkStructure(d), ...checkBlocklist(d)];

  if (findings.length === 0) findings.push(...(await checkSource(d, opts)));

  return {
    draft: d,
    pass: findings.length === 0,
    findings,
    retryable: findings.length > 0 && findings.every((f) => TRANSIENT_RULES.has(f.rule)),
    normalizedHash: factHash(d),
    quality: scoreQuality(d),
  };
}
