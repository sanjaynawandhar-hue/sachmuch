/** The shape a card needs, shared by web and native so both render one thing. */
export interface FactCardData {
  id: string;
  categoryId: number;
  categorySlug: string;
  categoryLabel: string;
  categoryEmoji: string;
  hook: string;
  body: string;
  sourceUrl: string;
  publisher: string;
  /** Rendered only when the licence obliges it. */
  attributionText?: string;
  licence: 'cc0' | 'cc_by' | 'cc_by_sa' | 'public_domain' | 'terms_only';
  /** 2+ shows the "2 sources" badge — our substitute for AI verification. */
  corroborationCount: number;
  difficulty: number;
  /** Quality gate output, 0–1. Feeds ranking; absent means "unscored". */
  quality?: number;
  /**
   * Which template produced this fact. Facts from one template share a sentence
   * shape, so the feed spaces them out even when they are different facts about
   * different people — six "X won N Filmfare Awards" cards in fourteen reads as
   * one fact repeated, whatever the names are.
   */
  templateId?: string;
  /** Running boost total. */
  boostCount?: number;
  /**
   * A Commons image attached to one of the fact's entities.
   *
   * Not a generic stock picture: it comes from the entity's own Wikidata P18
   * claim, so it cannot illustrate the wrong thing. 77% of our entities have
   * one. Several Commons licences require visible credit, which is why the
   * licence and author travel with the URL.
   */
  image?: { url: string; licence?: string; credit?: string; alt: string };
  entities: { qid: string; label: string }[];
  liked?: boolean;
  saved?: boolean;
}

export type Lang = 'en' | 'hi';
