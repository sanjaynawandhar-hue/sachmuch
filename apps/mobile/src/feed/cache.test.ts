import {upgradeLegacyFact} from '@sachmuch/core';
import { createFeedCache } from "./cache";
import { bilingual } from "../test/fixtures";
jest.mock("@react-native-async-storage/async-storage", () => ({getItem: async () => null, setItem: async () => {}}));
const page = {version: 2 as const, snapshotId: "test", totalEligible: 1, nextCursor: null, fetchedAt: "2026-10-17T00:00:00Z", facts: [upgradeLegacyFact(bilingual)]};
test("cache survives a new instance, isolates servers and ignores corrupt data", async () => {
  const data = new Map<string,string>();
  const storage = {getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key,value); }};
  await createFeedCache(storage).save("https://one.example",page);
  expect(await createFeedCache(storage).load("https://one.example")).toEqual(page);
  expect(await createFeedCache(storage).load("https://two.example")).toBeNull();
  data.set("sachmuch.feed.v2:https://one.example", "broken");
  expect(await createFeedCache(storage).load("https://one.example")).toBeNull();
});
test('upgrades the downloaded legacy fun edition without deleting it',async()=>{
 const old=JSON.stringify({version:1,fetchedAt:'2026-10-17T00:00:00Z',facts:[bilingual],nextCursor:null});
 const data=new Map([['sachmuch.feed.fun.v1:https://one.example',old]]);
 const cache=createFeedCache({getItem:async(k)=>data.get(k)??null,setItem:async()=>{throw Error('full');}});
 const loaded=await cache.load('https://one.example');
 expect(loaded?.facts[0]?.id).toBe('one');
 expect(loaded?.facts[0]?.texts.hi?.hook).toBe('एक रोचक तथ्य');
 expect(data.get('sachmuch.feed.fun.v1:https://one.example')).toBe(old);
});
