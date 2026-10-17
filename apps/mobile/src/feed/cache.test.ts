import { createFeedCache } from "./cache";
import { bilingual } from "../test/fixtures";
jest.mock("@react-native-async-storage/async-storage", () => ({getItem: async () => null, setItem: async () => {}}));
const page = {version: 1 as const, fetchedAt: "2026-10-17T00:00:00Z", facts: [bilingual]};
test("cache survives a new instance, isolates servers and ignores corrupt data", async () => {
  const data = new Map<string,string>();
  const storage = {getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key,value); }};
  await createFeedCache(storage).save("https://one.example",page);
  expect(await createFeedCache(storage).load("https://one.example")).toEqual(page);
  expect(await createFeedCache(storage).load("https://two.example")).toBeNull();
  data.set("sachmuch.feed.v1:https://one.example", "broken");
  expect(await createFeedCache(storage).load("https://one.example")).toBeNull();
});
