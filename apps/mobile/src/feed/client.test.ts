import { fetchFeed } from "./client";
import { bilingual } from "../test/fixtures";
const payload = {
  version: 1,
  fetchedAt: "2026-10-14T00:00:00Z",
  facts: [bilingual],
};
const original = global.fetch;
afterEach(() => {
  global.fetch = original;
  jest.useRealTimers();
});
test("fetches the public feed and preserves Hindi", async () => {
  global.fetch = jest.fn(async (url) => {
    expect(url).toBe("https://example.org/api/feed");
    return { ok: true, json: async () => payload } as Response;
  });
  expect(
    (await fetchFeed("https://example.org", { development: false })).facts[0]
      ?.hi?.hook,
  ).toBe("एक रोचक तथ्य");
});
test.each([
  "http://example.org",
  "javascript:alert(1)",
  "https://user:secret@example.org",
  "https://example.org/path",
  "",
])("rejects invalid release origin %s", async (origin) => {
  await expect(fetchFeed(origin, { development: false })).rejects.toThrow();
});
test("allows LAN HTTP only during development", async () => {
  global.fetch = jest.fn(
    async () => ({ ok: true, json: async () => payload }) as Response,
  );
  expect(
    (await fetchFeed("http://192.168.1.4:3000", { development: true })).version,
  ).toBe(1);
  await expect(
    fetchFeed("http://192.168.1.4:3000", { development: false }),
  ).rejects.toThrow();
});
test.each([false, "json", "payload"])(
  "rejects bad response %s",
  async (kind) => {
    global.fetch = jest.fn(
      async () =>
        ({
          ok: kind !== false,
          json: async () => {
            if (kind === "json") throw Error("bad json");
            return {};
          },
        }) as Response,
    );
    await expect(
      fetchFeed("https://example.org", { development: false }),
    ).rejects.toThrow();
  },
);
test("times out a stuck request", async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(
    (_u, options) =>
      new Promise((_r, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(Error("Aborted")),
        ),
      ),
  );
  const pending = fetchFeed("https://example.org", { development: false });
  const assertion = expect(pending).rejects.toThrow();
  jest.advanceTimersByTime(15000);
  await assertion;
});
test("honors an already aborted caller", async () => {
  const c = new AbortController();
  c.abort();
  await expect(
    fetchFeed("https://example.org", { development: false, signal: c.signal }),
  ).rejects.toThrow();
});
