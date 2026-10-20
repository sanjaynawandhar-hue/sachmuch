import { selectLanguageFacts, resolveCurrentId } from "./selection";
import { fact, bilingual } from "../test/fixtures";
test("Hindi preference retains complete English facts", () =>
  expect(
    selectLanguageFacts(
      [{ en: { ...fact.en, id: "two" } }, bilingual],
      "hi",
    ).map((f) => f.id),
  ).toEqual(["two", "one"]));
test("language switch keeps a matching ID or chooses first eligible", () => {
  expect(resolveCurrentId([fact.en], "one")).toBe("one");
  expect(resolveCurrentId([fact.en], "other")).toBe("one");
  expect(resolveCurrentId([], "one")).toBeNull();
});

test("movie categories are excluded in both languages", () => {
  const movie = { en: {...bilingual.en, id: "movie", categorySlug: "bollywood"}, hi: {...bilingual.hi!, id: "movie", categorySlug: "bollywood"} };
  for (const lang of ["en", "hi"] as const) expect(selectLanguageFacts([movie, bilingual], lang).map(f => f.id)).toEqual(["one"]);
});
test('Hindi-only survives English selection with correct script metadata',()=>{
 const {toDisplayFact}=require('./selection');
 const f={id:'hi-only',originalLanguage:'hi',texts:{hi:{hook:'हिन्दी हुक',body:'हिन्दी तथ्य'}},categoryId:1,categorySlug:'space',categoryLabel:'Space',categoryEmoji:'✦',sourceUrl:'https://example.org',publisher:'Example',licence:'cc0',knowledgeKind:'fact'};
 expect(toDisplayFact(f,'en')).toMatchObject({id:'hi-only',hook:'हिन्दी हुक',displayLanguage:'hi'});
});
