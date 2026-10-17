import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useFeed } from "./useFeed";
import { bilingual } from "../test/fixtures";
const original = global.fetch;
afterEach(() => {
  global.fetch = original;
});
const response = (id: string) =>
  ({
    ok: true,
    json: async () => ({
      version: 1,
      fetchedAt: "2026-10-14T00:00:00Z",
      facts: [{ en: { ...bilingual.en, id } }],
    }),
  }) as Response;
test("newest refresh wins even if older request ignores cancellation", async () => {
  const resolvers: ((v: Response) => void)[] = [];
  global.fetch = jest.fn(() => new Promise((r) => resolvers.push(r)));
  const { result } = await renderHook(() => useFeed("https://example.org"));
  await act(() => {
    result.current.refresh();
  });
  await act(() => resolvers[1]!(response("new")));
  await waitFor(() => expect(result.current.facts[0]?.en.id).toBe("new"));
  await act(() => resolvers[0]!(response("old")));
  expect(result.current.facts[0]?.en.id).toBe("new");
});
test("refresh failure retains loaded facts and permits retry", async () => {
  let fail = false;
  global.fetch = jest.fn(async () => {
    if (fail) throw Error("Offline");
    return response("one");
  });
  const { result } = await renderHook(() => useFeed("https://example.org"));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  fail = true;
  await act(() => {
    result.current.refresh();
  });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.facts[0]?.en.id).toBe("one");
  fail = false;
  await act(() => {
    result.current.refresh();
  });
  await waitFor(() => expect(result.current.error).toBeNull());
});
test("unmount cancels request", async () => {
  let signal: AbortSignal | undefined;
  global.fetch = jest.fn((_u, o) => {
    signal = o?.signal as AbortSignal;
    return new Promise(() => {});
  });
  const view = await renderHook(() => useFeed("https://example.org"));
  await view.unmount();
  expect(signal?.aborted).toBe(true);
});

test("paged feed deduplicates, follows cursor and stops at the final page", async () => {
  const cursor = "00000000-0000-0000-0000-000000000001";
  global.fetch = jest.fn().mockResolvedValueOnce({ok: true, json: async () => ({version: 1, fetchedAt: "2026-10-14T00:00:00Z", facts: [bilingual], nextCursor: cursor})}).mockResolvedValueOnce({ok: true, json: async () => ({version: 1, fetchedAt: "2026-10-14T00:00:00Z", facts: [bilingual, {en: {...bilingual.en, id: "second"}}], nextCursor: null})});
  const {result} = await renderHook(() => useFeed("https://example.org"));
  await waitFor(() => expect(result.current.hasMore).toBe(true));
  await act(() => result.current.loadMore());
  expect(result.current.facts.map((f) => f.en.id)).toEqual([bilingual.en.id, "second"]);
  expect(result.current.hasMore).toBe(false);
  expect(global.fetch).toHaveBeenLastCalledWith(`https://example.org/api/feed?paged=1&after=${cursor}`, expect.anything());
  await act(() => result.current.loadMore());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: async () => null, setItem: async () => {} }));
test("a downloaded feed survives reopening while the network is unavailable", async () => {
  let saved: any = null;
  const cache = {load: async () => saved, save: async (_origin: string, page: any) => { saved = page; }};
  global.fetch = jest.fn(async () => response("downloaded"));
  const first = await renderHook(() => useFeed("https://example.org", true, cache));
  await waitFor(() => expect(first.result.current.facts[0]?.en.id).toBe("downloaded"));
  await first.unmount();
  global.fetch = jest.fn(async () => { throw Error("Offline"); });
  const reopened = await renderHook(() => useFeed("https://example.org", true, cache));
  await waitFor(() => expect(reopened.result.current.error).toBe("unavailable"));
  expect(reopened.result.current.facts[0]?.en.id).toBe("downloaded");
});
test("a slow cache read cannot replace a fresh server response", async () => {
  let release!: (value: any) => void;
  const cache = {load: () => new Promise<any>((resolve) => {release = resolve;}), save: async () => {}};
  global.fetch = jest.fn(async () => response("fresh"));
  const view = await renderHook(() => useFeed("https://example.org", true, cache));
  await waitFor(() => expect(view.result.current.facts[0]?.en.id).toBe("fresh"));
  await act(() => release({version: 1, fetchedAt: "2026-10-14T00:00:00Z", facts: [bilingual]}));
  expect(view.result.current.facts[0]?.en.id).toBe("fresh");
});

test("returning to the app retries a failed connection", async () => {
  const {AppState} = require("react-native");
  let change!: (state: string) => void;
  const listener = jest.spyOn(AppState, "addEventListener").mockImplementation((_event: any, callback: any) => {change = callback; return {remove: jest.fn()};});
  global.fetch = jest.fn().mockRejectedValueOnce(Error("No data")).mockResolvedValueOnce(response("reconnected"));
  const view = await renderHook(() => useFeed("https://example.org"));
  await waitFor(() => expect(view.result.current.error).toBe("unavailable"));
  await act(() => change("active"));
  await waitFor(() => expect(view.result.current.facts[0]?.en.id).toBe("reconnected"));
  expect(view.result.current.error).toBeNull();
  await view.unmount();
  listener.mockRestore();
});
