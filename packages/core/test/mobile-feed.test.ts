import { describe, it, expect } from "vitest";
import { parseFeedEnvelope } from "../src/mobile-feed";
const fact = {
  id: "1",
  categoryId: 1,
  categorySlug: "space",
  categoryLabel: "Space",
  categoryEmoji: "✦",
  hook: "A fact",
  body: "The explanation",
  sourceUrl: "https://example.org/fact",
  publisher: "Publisher",
  licence: "cc0",
  corroborationCount: 1,
  difficulty: 1,
  entities: [],
  attributionText: "Credit",
  image: { url: "https://example.org/a.jpg", alt: "Photo", credit: "Author" },
};
const envelope = () => ({
  version: 1,
  fetchedAt: "2026-10-14T00:00:00.000Z",
  facts: [{ en: { ...fact }, hi: { ...fact, hook: "तथ्य", body: "विवरण" } }],
});
describe("mobile feed boundary", () => {
  it("preserves bilingual provenance and image credit", () => {
    const result = parseFeedEnvelope(envelope());
    expect(result.facts[0]?.hi?.hook).toBe("तथ्य");
    expect(result.facts[0]?.en.image?.credit).toBe("Author");
    expect(result.facts[0]?.en.attributionText).toBe("Credit");
  });
  it("accepts an empty feed", () =>
    expect(parseFeedEnvelope({ ...envelope(), facts: [] }).facts).toEqual([]));
  it.each([
    [
      "unknown version",
      (e: any) => {
        e.version = 2;
      },
    ],
    [
      "bad timestamp",
      (e: any) => {
        e.fetchedAt = "yesterday";
      },
    ],
    [
      "too many facts",
      (e: any) => {
        e.facts = Array.from({ length: 301 }, (_, i) => ({
          en: { ...fact, id: String(i) },
        }));
      },
    ],
    [
      "duplicate IDs",
      (e: any) => {
        e.facts.push(e.facts[0]);
      },
    ],
    [
      "translation mismatch",
      (e: any) => {
        e.facts[0].hi.id = "2";
      },
    ],
    [
      "incomplete Hindi",
      (e: any) => {
        e.facts[0].hi.body = "";
      },
    ],
    [
      "blank ID",
      (e: any) => {
        e.facts[0].en.id = " ";
      },
    ],
    [
      "invalid category",
      (e: any) => {
        e.facts[0].en.categoryId = -1;
      },
    ],
    [
      "unsafe source",
      (e: any) => {
        e.facts[0].en.sourceUrl = "javascript:alert(1)";
      },
    ],
    [
      "unsafe image",
      (e: any) => {
        e.facts[0].en.image = { url: "file:///secret", alt: "" };
      },
    ],
    [
      "missing publisher",
      (e: any) => {
        delete e.facts[0].en.publisher;
      },
    ],
  ])("rejects %s", (_, change) => {
    const e = envelope();
    change(e);
    expect(() => parseFeedEnvelope(e)).toThrow();
  });
});
