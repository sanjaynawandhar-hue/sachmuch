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
