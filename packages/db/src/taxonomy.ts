/**
 * The taxonomy: 29 categories, each holding 25–40 subtopics.
 *
 * The SUBTOPIC is the ingestion unit. "Cricket" produces slop; "Bodyline series
 * 1932-33" produces facts. Everything downstream — connector tasks, the
 * never-empty top-up in §9, template scoping — keys off subtopics, not categories.
 *
 * QIDs here are VERIFIED against live Wikidata by scripts/fix-qids.ts, never
 * written from memory. A subtopic with no QID is fine; it still drives the
 * keyword-based connectors.
 */
import type { CategoryDef } from './taxonomy-types';
import { finance } from './taxonomy/cat-01-finance';
import { bollywood } from './taxonomy/cat-02-bollywood';
import { hollywood } from './taxonomy/cat-03-hollywood';
import { actors } from './taxonomy/cat-04-actors';
import { ai } from './taxonomy/cat-05-ai';
import { metaverse } from './taxonomy/cat-06-metaverse';
import { startups } from './taxonomy/cat-07-startups';
import { humanBody } from './taxonomy/cat-08-human-body';
import { cricket } from './taxonomy/cat-09-cricket';
import { football } from './taxonomy/cat-10-football';
import { worldHistory } from './taxonomy/cat-11-world-history';
import { indianHistory } from './taxonomy/cat-12-indian-history';
import { space } from './taxonomy/cat-13-space';
import { animals } from './taxonomy/cat-14-animals';
import { physicsChemistry } from './taxonomy/cat-15-physics-chem';
import { technology } from './taxonomy/cat-16-technology';
import { geography } from './taxonomy/cat-17-geography';
import { indianCulture } from './taxonomy/cat-18-indian-culture';
import { food } from './taxonomy/cat-19-food';
import { music } from './taxonomy/cat-20-music';
import { television } from './taxonomy/cat-21-television';
import { language } from './taxonomy/cat-22-language';
import { psychology } from './taxonomy/cat-23-psychology';
import { environment } from './taxonomy/cat-24-environment';
import { inventions } from './taxonomy/cat-25-inventions';
import { law } from './taxonomy/cat-26-law';
import { otherSports } from './taxonomy/cat-27-other-sports';
import { numbers } from './taxonomy/cat-28-numbers';
import { strange } from './taxonomy/cat-29-strange';

export type { CategoryDef, SubtopicDef } from './taxonomy-types';

export const TAXONOMY: CategoryDef[] = [
  finance, bollywood, hollywood, actors, ai, metaverse, startups, humanBody,
  cricket, football, worldHistory, indianHistory, space, animals, physicsChemistry,
  technology, geography, indianCulture, food, music, television, language,
  psychology, environment, inventions, law, otherSports, numbers, strange,
];

export const CATEGORY_COUNT = TAXONOMY.length;

const bySlugIndex = new Map(TAXONOMY.map((c) => [c.slug, c]));
const byIdIndex = new Map(TAXONOMY.map((c) => [c.id, c]));

export const categoryBySlug = (slug: string) => bySlugIndex.get(slug);
export const categoryById = (id: number) => byIdIndex.get(id);

const subtopicIndex = new Map(
  TAXONOMY.flatMap((c) => c.subtopics.map((s) => [s.slug, { category: c, subtopic: s }] as const)),
);

export const subtopicBySlug = (slug: string) => subtopicIndex.get(slug);

/** Injected into connectors so they never import this package directly. */
export function subtopicQids(slug: string): string[] {
  return subtopicIndex.get(slug)?.subtopic.qids ?? [];
}

export const ALL_SUBTOPICS = [...subtopicIndex.values()];
