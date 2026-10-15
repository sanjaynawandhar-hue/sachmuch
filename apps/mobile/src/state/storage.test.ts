import { createAppStore, type StorageAdapter } from "./storage";
import { bilingual, fact } from "../test/fixtures";
function memory(
  raw: string | null = null,
): StorageAdapter & { raw: string | null } {
  return {
    raw,
    async getItem() {
      return this.raw;
    },
    async setItem(_key, value) {
      this.raw = value;
    },
  };
}
const saved = { fact: bilingual, savedAt: "2026-10-14T00:00:00.000Z" };
test("defaults follow system appearance and reads do not write", async () => {
  const db = memory();
  const s = await createAppStore(db).load();
  expect(s.preferences).toEqual({
    language: "en",
    appearance: "system",
    haptics: true,
    music: true,
    musicVolume: 0.12,
  });
  expect(db.raw).toBeNull();
});
test("hydrates Hindi before any writes and saves, reloads, removes a bilingual bookmark", async () => {
  const db = memory();
  const store = createAppStore(db);
  await store.load();
  await store.update((s) => ({
    ...s,
    preferences: { ...s.preferences, language: "hi" },
    saved: [saved],
  }));
  const reloaded = createAppStore(db);
  expect((await reloaded.load()).preferences.language).toBe("hi");
  expect((await reloaded.load()).saved[0]?.fact.hi?.hook).toBe("एक रोचक तथ्य");
  await reloaded.update((s) => ({ ...s, saved: [] }));
  expect((await createAppStore(db).load()).saved).toEqual([]);
});
test("recovers corrupt JSON without an automatic write", async () => {
  const db = memory("{bad");
  expect((await createAppStore(db).load()).saved).toEqual([]);
  expect(db.raw).toBe("{bad");
});
test("keeps valid bookmarks and deduplicates stable IDs during hydration", async () => {
  const db = memory();
  const store = createAppStore(db);
  const s = await store.load();
  db.raw = JSON.stringify({
    ...s,
    saved: [
      saved,
      { fact },
      saved,
      { fact: { en: { id: 4 } }, savedAt: saved.savedAt },
    ],
  });
  expect((await createAppStore(db).load()).saved).toHaveLength(1);
});
test("unknown versions cannot be overwritten by updates", async () => {
  const db = memory('{"version":99}');
  const store = createAppStore(db);
  await expect(store.load()).rejects.toThrow("version");
  await expect(store.update((s) => s)).rejects.toThrow();
  expect(db.raw).toBe('{"version":99}');
});
test("serializes functional writes using the newest snapshot", async () => {
  const db = memory();
  const store = createAppStore(db);
  await store.load();
  await Promise.all([
    store.update((s) => ({ ...s, saved: [saved] })),
    store.update((s) => ({
      ...s,
      preferences: { ...s.preferences, language: "hi" },
    })),
  ]);
  const s = await createAppStore(db).load();
  expect(s.saved).toHaveLength(1);
  expect(s.preferences.language).toBe("hi");
});
test("failed writes do not publish success or poison subsequent writes", async () => {
  const db = memory();
  const store = createAppStore(db);
  await store.load();
  const write = db.setItem;
  db.setItem = async () => {
    throw Error("disk full");
  };
  await expect(store.update((s) => ({ ...s, saved: [saved] }))).rejects.toThrow(
    "disk full",
  );
  expect((await store.load()).saved).toEqual([]);
  db.setItem = write;
  await store.update((s) => ({
    ...s,
    preferences: { ...s.preferences, language: "hi" },
  }));
  expect((await createAppStore(db).load()).preferences.language).toBe("hi");
});
test("invalid affinity cannot poison the ranker", async () => {
  const db = memory();
  const s = await createAppStore(db).load();
  db.raw = JSON.stringify({
    ...s,
    affinity: {
      byCategory: { 1: { score: -3, samples: -1 } },
      totalSignals: 1,
    },
  });
  expect((await createAppStore(db).load()).affinity.byCategory).toEqual({});
});
test("hydrates old installs with music and love defaults and validates persisted loves", async () => {
 const old=memory(JSON.stringify({version:1,preferences:{language:'en'},lovedIds:['fact-a','fact-a',null,42,'']}));
 const state=await createAppStore(old).load();
 expect(state.preferences.music).toBe(true);
 expect(state.preferences.musicVolume).toBe(0.12);
 expect(state.lovedIds).toEqual(['fact-a']);
});
