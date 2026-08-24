import { validateTemplate, type TemplateDef } from '../index';
import { mostAwardedPerson } from './awards';
import { stateVersusCountryArea, stateVersusCountryPopulation } from './comparisons';
import { WORLD_BANK_TEMPLATES } from './world-bank';
import { EXTREME_TEMPLATES } from './extremes';


/**
 * The template library.
 *
 * The arithmetic to a lakh: ~400 templates x ~300 average rows. Raising the
 * count means writing more templates, not paying anyone. Yield per template is
 * tracked on the `templates` table so it is visible which ones are worth
 * writing more of.
 */
export const TEMPLATES: TemplateDef[] = [
  mostAwardedPerson,
  stateVersusCountryPopulation,
  stateVersusCountryArea,
  ...WORLD_BANK_TEMPLATES,
  ...EXTREME_TEMPLATES,
];

/**
 * Withdrawn, not deleted — `films.ts` still holds them.
 *
 * `indianFilmDirector` and `hollywoodFilmDirector` produce "X directed Y,
 * released in 1965": a row, not a fact. Thousands of films are released every
 * year, so the sentence tells a reader nothing they would repeat. They were
 * briefly labelled `aggregate` to satisfy the type, which was the label being
 * wrong rather than the template being right.
 *
 * They come back when rewritten as aggregates — most films with one director,
 * longest gap between a director's films, directors whose debut and final film
 * are more than forty years apart.
 */
export const WITHDRAWN_TEMPLATES = ['indian-film-director', 'hollywood-film-director'];

/** Templates fed by a given connector. */
export const templatesFor = (sourceId: string) => TEMPLATES.filter((t) => t.sourceId === sourceId);

/**
 * Structural validation at load time. A malformed template is a build error,
 * not a runtime surprise three thousand facts later.
 */
export function validateLibrary(): { templateId: string; problem: string }[] {
  const problems = TEMPLATES.flatMap(validateTemplate);
  const ids = TEMPLATES.map((t) => t.id);
  for (const id of ids) {
    if (ids.filter((x) => x === id).length > 1) problems.push({ templateId: id, problem: 'duplicate template id' });
  }
  return problems;
}
