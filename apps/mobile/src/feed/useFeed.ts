import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { feedCache, type FeedCache } from "./cache";
import type { BilingualMobileFact } from "@sachmuch/core";
import { fetchFeed } from "./client";
export function useFeed(origin: string, enabled = true, cache: FeedCache = feedCache) {
  const [facts, setFacts] = useState<BilingualMobileFact[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const loadedOrigin = useRef(origin);
  const cursor = useRef<string | null>(null);
  const busy = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setStatus("ready");
      return;
    }
    if (loadedOrigin.current !== origin) { setFacts([]); loadedOrigin.current = origin; }
    const id = ++generation.current;
    const controller = new AbortController();
    cursor.current = null;
    busy.current = false;
    setHasMore(false);
    setStatus("loading");
    setError(null);
    let fresh = false;
    void cache.load(origin).then((page) => {
      if (page && !fresh && id === generation.current) {
        setFacts((previous) => previous.length ? previous : page.facts);
        setStatus("ready");
      }
    }).catch(() => {});
    fetchFeed(origin, { signal: controller.signal, development: __DEV__, paged: true })
      .then((feed) => {
        if (id === generation.current) {
          fresh = true;
          void cache.save(origin, feed).catch(() => {});
          cursor.current = feed.nextCursor ?? null;
          setHasMore(!!cursor.current);
          setFacts(feed.facts);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (id === generation.current) {
          setError(origin ? "unavailable" : "configuration");
          setStatus("error");
        }
      });
    return () => {
      generation.current++;
      controller.abort();
    };
  }, [origin, attempt, enabled, cache]);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  const latestError = useRef(error);
  latestError.current = error;
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && latestError.current) refresh();
    });
    return () => subscription.remove();
  }, [enabled, refresh]);
  const loadMore = useCallback(async () => {
    if (!enabled || busy.current || !cursor.current) return;
    busy.current = true;
    const id = generation.current;
    try {
      const page = await fetchFeed(origin, {development: __DEV__, paged: true, after: cursor.current});
      if (id !== generation.current) return;
      cursor.current = page.nextCursor ?? null;
      setHasMore(!!cursor.current);
      setFacts((previous) => {
        const ids = new Set(previous.map((f) => f.en.id));
        return [...previous, ...page.facts.filter((f) => !ids.has(f.en.id))].slice(-600);
      });
      setError(null);
    } catch { if (id === generation.current) setError("unavailable"); }
    finally { if (id === generation.current) busy.current = false; }
  }, [origin, enabled]);
  return { facts, status, error, refresh, hasMore, loadMore };
}
