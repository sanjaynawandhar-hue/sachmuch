/** Public wire contract. Never contains database credentials or unpublished facts. */
export interface MobileFact {
  id: string;
  categoryId: number;
  categorySlug: string;
  categoryLabel: string;
  categoryEmoji: string;
  hook: string;
  body: string;
  sourceUrl: string;
  publisher: string;
  licence: "cc0" | "cc_by" | "cc_by_sa" | "public_domain" | "terms_only";
  corroborationCount: number;
  difficulty: number;
  entities: { qid: string; label: string }[];
  attributionText?: string;
  quality?: number;
  templateId?: string;
  boostCount?: number;
  image?: { url: string; alt: string; licence?: string; credit?: string };
}
export interface BilingualMobileFact {
  en: MobileFact;
  hi?: MobileFact;
}
export interface FeedEnvelope {
  version: 1;
  fetchedAt: string;
  facts: BilingualMobileFact[];
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      !!u.hostname &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
function validFact(v: unknown): v is MobileFact {
  if (!record(v)) return false;
  if (
    ![
      "id",
      "categorySlug",
      "categoryLabel",
      "categoryEmoji",
      "hook",
      "body",
      "publisher",
    ].every((k) => text(v[k]))
  )
    return false;
  if (
    !Number.isInteger(v.categoryId) ||
    (v.categoryId as number) <= 0 ||
    !isWebUrl(v.sourceUrl)
  )
    return false;
  if (
    !["cc0", "cc_by", "cc_by_sa", "public_domain", "terms_only"].includes(
      String(v.licence),
    )
  )
    return false;
  if (
    !Number.isInteger(v.corroborationCount) ||
    (v.corroborationCount as number) < 0 ||
    !Number.isFinite(v.difficulty)
  )
    return false;
  if (
    !Array.isArray(v.entities) ||
    !v.entities.every((e) => record(e) && text(e.qid) && text(e.label))
  )
    return false;
  if (
    ["attributionText", "templateId"].some(
      (k) => v[k] !== undefined && typeof v[k] !== "string",
    )
  )
    return false;
  if (
    v.quality !== undefined &&
    (typeof v.quality !== "number" ||
      !Number.isFinite(v.quality) ||
      v.quality < 0 ||
      v.quality > 1)
  )
    return false;
  if (
    v.boostCount !== undefined &&
    (!Number.isInteger(v.boostCount) || (v.boostCount as number) < 0)
  )
    return false;
  if (v.image !== undefined) {
    const i = v.image;
    if (
      !record(i) ||
      !isWebUrl(i.url) ||
      typeof i.alt !== "string" ||
      ["credit", "licence"].some(
        (k) => i[k] !== undefined && typeof i[k] !== "string",
      )
    )
      return false;
  }
  return true;
}
export function parseBilingualFact(value: unknown): BilingualMobileFact {
  if (
    !record(value) ||
    !validFact(value.en) ||
    (value.hi !== undefined &&
      (!validFact(value.hi) || value.hi.id !== value.en.id))
  )
    throw new Error("Invalid fact");
  return { en: value.en, ...(value.hi ? { hi: value.hi as MobileFact } : {}) };
}
export function parseFeedEnvelope(input: unknown): FeedEnvelope {
  if (
    !record(input) ||
    input.version !== 1 ||
    typeof input.fetchedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(input.fetchedAt) ||
    !Number.isFinite(Date.parse(input.fetchedAt)) ||
    !Array.isArray(input.facts) ||
    input.facts.length > 300
  )
    throw new Error("Invalid feed");
  const facts = input.facts.map(parseBilingualFact);
  if (new Set(facts.map((f) => f.en.id)).size !== facts.length)
    throw new Error("Duplicate fact");
  return { version: 1, fetchedAt: input.fetchedAt, facts };
}
