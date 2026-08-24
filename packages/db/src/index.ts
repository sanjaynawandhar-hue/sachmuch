export * as schema from './schema';
export { createDb, connectionString } from './client';
export { SOURCE_REGISTRY, type SourceSeed } from './sources';
export {
  TAXONOMY, CATEGORY_COUNT, ALL_SUBTOPICS,
  categoryById, categoryBySlug, subtopicBySlug, subtopicQids,
} from './taxonomy';
export type { CategoryDef, SubtopicDef } from './taxonomy-types';
