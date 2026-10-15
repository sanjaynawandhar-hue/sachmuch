import { parseFeedEnvelope, type FeedEnvelope } from "@sachmuch/core";
function feedUrl(origin: string, development: boolean): string {
  const u = new URL(origin);
  const local =
    u.hostname === "localhost" ||
    u.hostname === "127.0.0.1" ||
    u.hostname === "[::1]" ||
    /^10\.(\d{1,3}\.){2}\d{1,3}$/.test(u.hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(u.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(u.hostname);
  if (
    (u.protocol !== "https:" &&
      !(development && local && u.protocol === "http:")) ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw Error("Invalid API origin");
  return new URL("/api/feed", u).toString();
}
export async function fetchFeed(
  origin: string,
  options: { signal?: AbortSignal; development: boolean; paged?: boolean; after?: string },
): Promise<FeedEnvelope> {
  const target = new URL(feedUrl(origin, options.development));
  if (options.paged) target.searchParams.set("paged", "1");
  if (options.after) target.searchParams.set("after", options.after);
  const url = target.toString();
  if (options.signal?.aborted) throw Error("Aborted");
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, 15000);
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(new Error("Aborted"));
    controller.signal.addEventListener("abort", rejectAbort);
  });
  try {
    const response = await Promise.race([
      fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
      aborted,
    ]);
    if (!response.ok) throw Error("Feed unavailable");
    return parseFeedEnvelope(await Promise.race([response.json(), aborted]));
  } finally {
    clearTimeout(timeout);
    if (rejectAbort)
      controller.signal.removeEventListener("abort", rejectAbort);
    options.signal?.removeEventListener("abort", abort);
  }
}
