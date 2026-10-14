import { useCallback, useEffect, useRef, useState } from "react";
import type { BilingualMobileFact } from "@sachmuch/core";
import { fetchFeed } from "./client";
export function useFeed(origin: string, enabled = true) {
  const [facts, setFacts] = useState<BilingualMobileFact[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!enabled) {
      setStatus("ready");
      return;
    }
    const id = ++generation.current;
    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    fetchFeed(origin, { signal: controller.signal, development: __DEV__ })
      .then((feed) => {
        if (id === generation.current) {
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
  }, [origin, attempt, enabled]);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  return { facts, status, error, refresh };
}
