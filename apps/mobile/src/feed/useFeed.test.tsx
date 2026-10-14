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
