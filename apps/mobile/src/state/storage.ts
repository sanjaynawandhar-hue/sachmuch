import {
  emptyAffinity,
  parseBilingualFact,
  type Affinity,
  type BilingualMobileFact,
} from "@sachmuch/core";
export interface Preferences {
  language: "en" | "hi";
  appearance: "system" | "light" | "dark";
  haptics: boolean;
  music: boolean;
  musicVolume: number;
}
export interface SavedFact {
  fact: BilingualMobileFact;
  savedAt: string;
}
export interface AppSnapshot {
  version: 1;
  preferences: Preferences;
  saved: SavedFact[];
  lovedIds: string[];
  affinity: Affinity;
}
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
const KEY = "sachmuch.app.v1";
const defaults = (): AppSnapshot => ({
  version: 1,
  preferences: { language: "en", appearance: "system", haptics: true, music: true, musicVolume: 0.12 },
  saved: [],
  lovedIds: [],
  affinity: emptyAffinity(),
});
function decode(raw: string | null): AppSnapshot {
  if (!raw) return defaults();
  let p: any;
  try {
    p = JSON.parse(raw);
  } catch {
    return defaults();
  }
  if (p && p.version !== undefined && p.version !== 1)
    throw Error(
      "Unsupported storage version. Your saved data has been preserved.",
    );
  const state = defaults();
  if (!p || typeof p !== "object") return state;
  if (["en", "hi"].includes(p.preferences?.language))
    state.preferences.language = p.preferences.language;
  if (["system", "light", "dark"].includes(p.preferences?.appearance))
    state.preferences.appearance = p.preferences.appearance;
  if (typeof p.preferences?.haptics === "boolean")
    state.preferences.haptics = p.preferences.haptics;
  if (typeof p.preferences?.music === "boolean") state.preferences.music = p.preferences.music;
  if (typeof p.preferences?.musicVolume === "number" && Number.isFinite(p.preferences.musicVolume))
    state.preferences.musicVolume = Math.max(0, Math.min(0.3, p.preferences.musicVolume));
  state.lovedIds = [...new Set<string>((Array.isArray(p.lovedIds) ? p.lovedIds : []).filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0))];
  const ids = new Set<string>();
  for (const entry of Array.isArray(p.saved) ? p.saved : []) {
    try {
      const fact = parseBilingualFact(entry.fact);
      if (
        typeof entry.savedAt !== "string" ||
        !Number.isFinite(Date.parse(entry.savedAt)) ||
        ids.has(fact.en.id)
      )
        continue;
      ids.add(fact.en.id);
      state.saved.push({ fact, savedAt: entry.savedAt });
    } catch {
      /* An invalid entry must not hide other saved facts. */
    }
  }
  const a = p.affinity;
  if (
    a &&
    Number.isInteger(a.totalSignals) &&
    a.totalSignals >= 0 &&
    a.byCategory &&
    typeof a.byCategory === "object"
  ) {
    for (const [id, v] of Object.entries(a.byCategory)) {
      const item = v as { score?: unknown; samples?: unknown } | null;
      if (
        Number.isInteger(Number(id)) &&
        Number(id) > 0 &&
        item &&
        typeof item.score === "number" &&
        Number.isFinite(item.score) &&
        item.score >= 0 &&
        item.score <= 1 &&
        typeof item.samples === "number" &&
        Number.isInteger(item.samples) &&
        item.samples >= 0
      )
        state.affinity.byCategory[Number(id)] = {
          score: item.score,
          samples: item.samples,
        };
    }
    state.affinity.totalSignals = a.totalSignals;
  }
  return state;
}
export function createAppStore(adapter: StorageAdapter) {
  let state: AppSnapshot | undefined;
  let loading: Promise<AppSnapshot> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const load = (): Promise<AppSnapshot> => {
    if (state) return Promise.resolve(state);
    if (!loading)
      loading = adapter
        .getItem(KEY)
        .then((raw) => {
          state = decode(raw);
          return state;
        })
        .finally(() => {
          loading = undefined;
        });
    return loading;
  };
  return {
    load,
    update(
      change: (current: AppSnapshot) => AppSnapshot,
    ): Promise<AppSnapshot> {
      const operation = queue.then(async () => {
        const current = await load();
        const next = change(current);
        await adapter.setItem(KEY, JSON.stringify(next));
        state = next;
        return next;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
export type AppStore = ReturnType<typeof createAppStore>;
