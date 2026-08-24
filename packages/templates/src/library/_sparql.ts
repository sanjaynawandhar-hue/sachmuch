/**
 * Shared SPARQL fragments for Wikidata templates.
 *
 * Two rules every template query must follow, both learned the hard way:
 *
 * 1. Bind labels PER LANGUAGE with an explicit FILTER. `SERVICE wikibase:label`
 *    with an "en,hi" fallback list silently returns the English label under the
 *    Hindi variable name, which is machine-mangled Hindi by another route and
 *    invisible in the results. Binding separately is what lets the pipeline KNOW
 *    Hindi is missing rather than guess.
 *
 * 2. No LIMIT in the template. The connector pages with LIMIT/OFFSET at 500 and
 *    the endpoint kills anything over 60 seconds.
 */

/** English label required, Hindi optional. `?x`, `?xLabelEn`, `?xLabelHi`. */
export const labels = (v: string) => `
  ?${v} rdfs:label ?${v}LabelEn . FILTER(LANG(?${v}LabelEn) = "en")
  OPTIONAL { ?${v} rdfs:label ?${v}LabelHi . FILTER(LANG(?${v}LabelHi) = "hi") }`;

/** P21, needed for Hindi verb agreement. Absent gender withholds the Hindi side. */
export const gender = (v: string) => `
  OPTIONAL { ?${v} wdt:P21 ?${v}Gender . }`;

/**
 * The citation. A Wikipedia sitelink, stored as the source URL — we link the
 * article, never copy its CC BY-SA prose.
 */
export const article = (v: string) => `
  ?article schema:about ?${v} ; schema:isPartOf <https://en.wikipedia.org/> .`;

/** Substituted by the connector with a VALUES clause pinning one subtopic. */
export const SCOPE = '{{SCOPE}}';

/**
 * "Is `member` inside the container `group`?"
 *
 * Wikidata is inconsistent about which relation attaches a thing to its
 * container. A Filmfare category attaches to the Filmfare Awards by P31
 * (instance of); other hierarchies use P361 (part of) or P279 (subclass of).
 * Scoping on only one of them silently returns nothing, which is how the first
 * version of the award template came back with zero rows against a QID that was
 * perfectly correct.
 *
 * The `*` covers the zero-length case too, so scoping directly to a specific
 * award still matches that award itself.
 */
export const inGroup = (member: string, group: string) =>
  `?${member} (wdt:P31|wdt:P361|wdt:P279)* ?${group} .`;
