import { createWikidataConnector, createWorldBankConnector, type Connector } from '@sachmuch/connectors';
import { subtopicBySlug, subtopicQids } from '@sachmuch/db';
import { templatesFor, validateLibrary } from '@sachmuch/templates/library';

/**
 * Wires the connectors. This is the only file that knows which connectors exist
 * and it is deliberately trivial — adding a source is one file in `connectors/`
 * plus one line here plus one row in `sources`.
 */
export function buildConnectors(): Connector[] {
  const problems = validateLibrary();
  if (problems.length > 0) {
    // A malformed template is a build error, not a surprise 3,000 facts later.
    throw new Error(
      `template library is invalid:\n${problems.map((p) => `  ${p.templateId}: ${p.problem}`).join('\n')}`,
    );
  }

  return [
    createWikidataConnector({
      templates: templatesFor('wikidata-sparql').filter((t) => t.subtopics.length > 0),
      subtopicQids,
      subtopicCategoryId: (slug) => subtopicBySlug(slug)?.category.id,
    }),
    createWorldBankConnector({ templates: templatesFor('world-bank') }),
  ];
}
