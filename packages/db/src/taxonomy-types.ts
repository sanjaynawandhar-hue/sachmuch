/**
 * The taxonomy is data, and the SUBTOPIC is the ingestion unit.
 * "Cricket" produces slop; "Bodyline series 1932-33" produces facts.
 */

export interface SubtopicDef {
  /** kebab-case, unique within its category */
  slug: string;
  en: string;
  hi: string;
  /** Wikidata QIDs this subtopic is anchored to. Drives connector discover(). */
  qids?: string[];
  /** Free-text hints for the non-SPARQL connectors. */
  keywords?: string[];
}

export interface CategoryDef {
  /** Stable numeric id; also the position that determines the tint rotation. */
  id: number;
  slug: string;
  en: string;
  hi: string;
  emoji: string;
  /** False for categories that are mostly grim history or adult subject matter. */
  kidsSafe: boolean;
  subtopics: SubtopicDef[];
}
