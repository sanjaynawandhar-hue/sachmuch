import type { FactDraft } from '@sachmuch/templates';
import type { GateFinding } from './structural';

/**
 * §7.4 — the editorial blocklist.
 *
 * This is a credibility instrument, not a profanity filter. A published wrong
 * or inflammatory fact costs more than a thin category does, so these rules are
 * deliberately blunt and err toward rejecting.
 *
 * Extend by adding to the arrays below — that is the whole extension story.
 */

export interface BlockRule {
  id: string;
  /** Why this exists, so a future edit knows what it is protecting. */
  why: string;
  patterns: RegExp[];
}

export const BLOCK_RULES: BlockRule[] = [
  {
    id: 'medical_advice',
    why: 'A facts app must not phrase a claim as a treatment instruction. State findings, never advice.',
    // NOTE: JavaScript's \\b is ASCII-only and never matches at a Devanagari
    // boundary, so the Hindi patterns here deliberately carry no word anchors.
    patterns: [
      /\b(you should|you must|take \d+\s*(mg|ml)|consult your doctor before|cures?\b|treats?\b|prevents? (cancer|covid|diabetes))\b/i,
      /(इलाज|दवा लें|सेवन करें|ठीक हो जाता है)/,
    ],
  },
  {
    id: 'communal_or_caste_framing',
    why: 'Any framing that sets communities against each other. Non-negotiable for an Indian audience.',
    patterns: [
      /\b(inferior|superior) (caste|race|religion|community)\b/i,
      /\b(anti-national|jihadi|infidel|untouchable[s]? (are|were) )\b/i,
      /(हिंदू|मुस्लिम|सिख|ईसाई)\s+(बनाम|के ख़िलाफ़|विरोधी)/,
    ],
  },
  {
    id: 'ongoing_legal_case',
    why: 'Claims about live proceedings age badly and carry legal risk. Settled matters only.',
    patterns: [
      /\b(is (currently )?(facing|under) (trial|investigation|probe)|ongoing (case|trial|litigation)|sub judice|alleged(ly)? (fraud|murder|assault|rape))\b/i,
      /(विचाराधीन|मुक़दमा चल रहा)/,
    ],
  },
  {
    id: 'gore',
    why: 'The feed is swipeable and lands on a lock screen. Graphic detail has no place in it.',
    patterns: [
      /\b(dismembered|decapitat|mutilat|disembowel|bloodbath|gruesome(ly)? (killed|murdered))\b/i,
      /(टुकड़े-टुकड़े|सिर काट)/,
    ],
  },
  {
    id: 'sexual_content',
    why: 'Kids mode exists, but the main feed still has to be safe on a family phone.',
    patterns: [/\b(pornograph|explicit sexual|sexually explicit)\b/i],
  },
  {
    id: 'self_harm',
    why: 'Never surfaced as trivia, in any framing.',
    patterns: [/\b(how to (kill|harm) (yourself|oneself)|suicide method)\b/i],
  },
  {
    id: 'unverifiable_claim_framing',
    why: 'Hedged language means the underlying data did not actually support the claim.',
    patterns: [
      /\b(it is (said|believed|rumou?red)|legend has it|some (people )?claim|reportedly|allegedly)\b/i,
      /(ऐसा कहा जाता है|माना जाता है कि|अफ़वाह)/,
    ],
  },
];

/**
 * §7.4 — no facts about living private individuals.
 *
 * Public figures are fine: a fact about an actor's filmography or a chief
 * executive's tenure is exactly what the app is for. What is forbidden is a
 * fact about a person who is not a public figure. Our data only ever produces
 * people via Wikidata entities, and having a Wikidata item about you as a
 * person is itself a strong notability signal — so the practical rule is:
 * a person-bearing fact must carry an entity QID. A person named in prose with
 * no entity behind them is not someone we can vouch for.
 */
export function checkPrivateIndividual(d: FactDraft): GateFinding[] {
  if (d.entityQids.length > 0) return [];
  // Two or more capitalised multi-word names with no entity backing them.
  const nameLike = d.hookEn.match(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g) ?? [];
  if (nameLike.length === 0) return [];
  return [{
    rule: 'blocklist.unbacked_person',
    detail: `names "${nameLike[0]}" with no entity behind it`,
  }];
}

export function checkBlocklist(d: FactDraft): GateFinding[] {
  const findings: GateFinding[] = [];
  const texts = [d.hookEn, d.bodyEn, d.hookHi ?? '', d.bodyHi ?? ''];

  for (const rule of BLOCK_RULES) {
    for (const pattern of rule.patterns) {
      const hit = texts.find((t) => pattern.test(t));
      if (hit) {
        findings.push({ rule: `blocklist.${rule.id}`, detail: `matched ${pattern}` });
        break;
      }
    }
  }
  findings.push(...checkPrivateIndividual(d));
  return findings;
}
