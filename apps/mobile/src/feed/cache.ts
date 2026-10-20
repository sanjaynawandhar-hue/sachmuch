import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFeedV2, parseFeedEnvelope, upgradeLegacyFact, type FeedV2 } from "@sachmuch/core";
import type { StorageAdapter } from "../state/storage";
export interface FeedCache {
  load(origin: string): Promise<FeedV2 | null>;
  save(origin: string, page: FeedV2): Promise<void>;
}
/** Cache only validated public facts, separately from personal preferences. */
export function createFeedCache(storage: StorageAdapter): FeedCache {
  let queue: Promise<unknown> = Promise.resolve();
  const key = (origin: string) => `sachmuch.feed.v2:${origin}`;
  return {
    async load(origin) {
      try {
        const raw = await storage.getItem(key(origin));
        if (raw) return parseFeedV2(JSON.parse(raw));
        const legacyRaw = await storage.getItem(`sachmuch.feed.fun.v1:${origin}`);
        if (!legacyRaw) return null;
        const legacy = parseFeedEnvelope(JSON.parse(legacyRaw));
        // The finite fun edition had no additional pages. Never invent a global count.
        if (legacy.nextCursor) return null;
        return parseFeedV2({version:2,fetchedAt:legacy.fetchedAt,facts:legacy.facts.map(upgradeLegacyFact),nextCursor:null,snapshotId:'legacy-curated',totalEligible:legacy.facts.length});
      } catch { return null; }
    },
    save(origin, page) {
      const validated = parseFeedV2(page);
      const write = queue.then(() => storage.setItem(key(origin), JSON.stringify(validated)));
      queue = write.catch(() => {});
      return write;
    },
  };
}
export const feedCache = createFeedCache(AsyncStorage);
