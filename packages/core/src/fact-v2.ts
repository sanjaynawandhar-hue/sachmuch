import { parseBilingualFact, isWebUrl, type MobileFact } from './mobile-feed';

export type Language = 'en' | 'hi';
export type FactText = { hook: string; body: string };
export type FactV2 = {
  id: string;
  originalLanguage: Language;
  texts: Partial<Record<Language, FactText>>;
  categoryId: number;
  categorySlug: string;
  categoryLabel: string;
  categoryEmoji: string;
  sourceUrl: string;
  publisher: string;
  licence: MobileFact['licence'];
  attributionText?: string;
  knowledgeKind: 'fact' | 'belief' | 'folklore';
  asOf?: string;
  validUntil?: string;
  templateId?: string;
  quality?: number;
};
export type FeedV2 = {
  version: 2;
  fetchedAt: string;
  facts: FactV2[];
  nextCursor: string | null;
  snapshotId: string;
  totalEligible: number;
  totalEligibleAsOf?: string;
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const language = (v: unknown): v is Language => v === 'en' || v === 'hi';
const date = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)) return false;
  const time = Date.parse(v);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === v.slice(0,10);
};

export function parseFactV2(input: unknown): FactV2 {
  if (!record(input) || !language(input.originalLanguage) || !record(input.texts)) throw Error('Invalid fact');
  const texts: FactV2['texts'] = {};
  for (const [lang, value] of Object.entries(input.texts)) {
    if (!language(lang) || !record(value) || !nonempty(value.hook) || !nonempty(value.body)) throw Error('Invalid fact text');
    texts[lang] = { hook: value.hook, body: value.body };
  }
  if (!texts[input.originalLanguage] || !['id','categorySlug','categoryLabel','categoryEmoji','publisher'].every(k => nonempty(input[k])) ||
      !Number.isSafeInteger(input.categoryId) || (input.categoryId as number) < 1 || !isWebUrl(input.sourceUrl) ||
      !['cc0','cc_by','cc_by_sa','public_domain','terms_only'].includes(String(input.licence)) ||
      !['fact','belief','folklore'].includes(String(input.knowledgeKind)) ||
      ['attributionText','templateId'].some(k => input[k] !== undefined && !nonempty(input[k])) ||
      ['asOf','validUntil'].some(k => input[k] !== undefined && !date(input[k])) ||
      (input.quality !== undefined && (typeof input.quality !== 'number' || !Number.isFinite(input.quality) || input.quality < 0 || input.quality > 1))) throw Error('Invalid fact');
  // Return only public fields; never pass unknown database metadata to clients.
  return {
    id: input.id as string, originalLanguage: input.originalLanguage, texts,
    categoryId: input.categoryId as number, categorySlug: input.categorySlug as string,
    categoryLabel: input.categoryLabel as string, categoryEmoji: input.categoryEmoji as string,
    sourceUrl: input.sourceUrl, publisher: input.publisher as string,
    licence: input.licence as FactV2['licence'], knowledgeKind: input.knowledgeKind as FactV2['knowledgeKind'],
    ...(input.attributionText !== undefined ? {attributionText: input.attributionText as string} : {}),
    ...(input.templateId !== undefined ? {templateId: input.templateId as string} : {}),
    ...(input.asOf !== undefined ? {asOf: input.asOf as string} : {}),
    ...(input.validUntil !== undefined ? {validUntil: input.validUntil as string} : {}),
    ...(input.quality !== undefined ? {quality: input.quality as number} : {}),
  };
}

export function selectFactText(fact: FactV2, preferred: Language): {language: Language; text: FactText} {
  for (const lang of [preferred, fact.originalLanguage, 'en', 'hi'] as Language[]) {
    const text = fact.texts[lang];
    if (text?.hook.trim() && text.body.trim()) return {language: lang, text};
  }
  throw Error('Fact has no complete text');
}

export function parseFeedV2(input: unknown): FeedV2 {
  if (!record(input) || (input.totalEligibleAsOf!==undefined&&!date(input.totalEligibleAsOf)) || input.version !== 2 || !date(input.fetchedAt) || !input.fetchedAt.includes('T') ||
      !Array.isArray(input.facts) || input.facts.length > 300 || !nonempty(input.snapshotId) ||
      !Number.isSafeInteger(input.totalEligible) || (input.totalEligible as number) < input.facts.length ||
      (input.nextCursor !== null && (!nonempty(input.nextCursor) || input.nextCursor.length > 512))) throw Error('Invalid feed');
  const facts = input.facts.map(parseFactV2);
  if (new Set(facts.map(f => f.id)).size !== facts.length) throw Error('Duplicate fact');
  return {version: 2, fetchedAt: input.fetchedAt, facts, nextCursor: input.nextCursor as string | null, snapshotId: input.snapshotId, totalEligible: input.totalEligible as number,...(input.totalEligibleAsOf?{totalEligibleAsOf:input.totalEligibleAsOf as string}:{})};
}

export function upgradeLegacyFact(input:unknown):FactV2 {
 const {en,hi}=parseBilingualFact(input);
 return parseFactV2({...en,attributionText:en.attributionText?.trim() || undefined,templateId:en.templateId?.trim() || undefined,originalLanguage:'en',knowledgeKind:'fact',
  texts:{en:{hook:en.hook,body:en.body},...(hi?{hi:{hook:hi.hook,body:hi.body}}:{})}});
}
