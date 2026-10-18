import { selectLanguageFacts, resolveCurrentId } from "./selection";
import { fact, bilingual } from "../test/fixtures";
test("Hindi excludes incomplete translations", () =>
  expect(
    selectLanguageFacts(
      [{ en: { ...fact.en, id: "two" } }, bilingual],
      "hi",
    ).map((f) => f.id),
  ).toEqual(["one"]));
test("language switch keeps a matching ID or chooses first eligible", () => {
  expect(resolveCurrentId([fact.en], "one")).toBe("one");
  expect(resolveCurrentId([fact.en], "other")).toBe("one");
  expect(resolveCurrentId([], "one")).toBeNull();
});

test("movie categories are excluded in both languages", () => {
  const movie = { en: {...bilingual.en, id: "movie", categorySlug: "bollywood"}, hi: {...bilingual.hi!, id: "movie", categorySlug: "bollywood"} };
  for (const lang of ["en", "hi"] as const) expect(selectLanguageFacts([movie, bilingual], lang).map(f => f.id)).toEqual(["one"]);
});
