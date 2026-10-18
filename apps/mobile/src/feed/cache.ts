import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFeedEnvelope, type FeedEnvelope } from "@sachmuch/core";
import type { StorageAdapter } from "../state/storage";
export interface FeedCache {
  load(origin: string): Promise<FeedEnvelope | null>;
  save(origin: string, page: FeedEnvelope): Promise<void>;
}
/** Cache only validated public facts, separately from personal preferences. */
export function createFeedCache(storage: StorageAdapter): FeedCache {
  let queue: Promise<unknown> = Promise.resolve();
  const key = (origin: string) => `sachmuch.feed.fun.v1:${origin}`;
  return {
    async load(origin) {
      try {
        const raw = await storage.getItem(key(origin));
        return raw ? parseFeedEnvelope(JSON.parse(raw)) : null;
      } catch { return null; }
    },
    save(origin, page) {
      const validated = parseFeedEnvelope(page);
      const write = queue.then(() => storage.setItem(key(origin), JSON.stringify(validated)));
      queue = write.catch(() => {});
      return write;
    },
  };
}
export const feedCache = createFeedCache(AsyncStorage);
