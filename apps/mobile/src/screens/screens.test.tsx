import React from "react";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Share, Linking } from "react-native";
import { DiscoverScreen } from "./DiscoverScreen";
import { SavedScreen } from "./SavedScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SourceSheet } from "../components/SourceSheet";
import { AppStateProvider } from "../state/AppStateProvider";
import { createAppStore } from "../state/storage";
import { bilingual, fact } from "../test/fixtures";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: async () => null,
  setItem: async () => {},
}));
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-haptics", () => ({ selectionAsync: async () => {} }));
const original = global.fetch;
beforeEach(() => {
  jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({width:390,height:844,scale:3,fontScale:1});
  global.fetch = jest.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({
          version: 1,
          fetchedAt: "2026-10-14T00:00:00Z",
          facts: [bilingual],
        }),
      }) as Response,
  );
});
afterEach(() => {
  global.fetch = original;
  jest.restoreAllMocks();
});
function wrapper(
  child: React.ReactNode,
  store = createAppStore({
    getItem: async () => null,
    setItem: async () => {},
  }),
) {
  return <AppStateProvider store={store}>{child}</AppStateProvider>;
}
test("feed displays content, source and finite end; body scrolling does not advance", async () => {
  await render(wrapper(<DiscoverScreen origin="https://example.org" />));
  await screen.findByText("A surprising fact");
  await fireEvent.press(screen.getByRole("button", { name: "Read full fact" }));
  await fireEvent.scroll(screen.getByTestId("full-fact-reader"), {
    nativeEvent: { contentOffset: { y: 80 } },
  });
  expect(screen.getAllByText("A surprising fact").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  await act(() => screen.getByRole("adjustable").props.onAccessibilityAction({nativeEvent: {actionName: "increment"}}));
  expect(await screen.findByText("You’re all caught up.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Read again" }));
  expect(await screen.findByText("A surprising fact")).toBeTruthy();
});
test("failed save remains unsaved and gives visible retry information", async () => {
  const store = createAppStore({
    getItem: async () => null,
    setItem: async () => {
      throw Error("full");
    },
  });
  await render(wrapper(<DiscoverScreen origin="https://example.org" />, store));
  await screen.findByText("A surprising fact");
  await fireEvent.press(screen.getByRole("button", { name: "Save fact" }));
  expect(await screen.findByText(/Couldn’t save/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save fact" })).toBeTruthy();
});
test("language can switch while fetch is pending", async () => {
  let done!: (v: Response) => void;
  global.fetch = jest.fn(
    () =>
      new Promise((r) => {
        done = r;
      }),
  );
  await render(wrapper(<DiscoverScreen origin="https://example.org" />));
  await fireEvent.press(await screen.findByRole("button", { name: "हिन्दी" }));
  done({
    ok: true,
    json: async () => ({
      version: 1,
      fetchedAt: "2026-10-14T00:00:00Z",
      facts: [bilingual],
    }),
  } as Response);
  expect(await screen.findByText("एक रोचक तथ्य")).toBeTruthy();
});
test("share dismissal is not an error", async () => {
  jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: Share.dismissedAction });
  await render(wrapper(<DiscoverScreen origin="https://example.org" />));
  await screen.findByText("A surprising fact");
  await fireEvent.press(screen.getByRole("button", { name: "Share fact" }));
  expect(screen.queryByRole("alert")).toBeNull();
});
test("failed source opening is visible", async () => {
  jest.spyOn(Linking, "openURL").mockRejectedValue(Error("no browser"));
  await render(wrapper(<SourceSheet fact={bilingual.en} onClose={() => {}} />));
  await fireEvent.press(
    await screen.findByRole("button", { name: "Read original source" }),
  );
  expect(await screen.findByText(/Couldn’t open/)).toBeTruthy();
});
test("saved copy can be removed and missing Hindi is explicit", async () => {
  const store = createAppStore({
    getItem: async () => null,
    setItem: async () => {},
  });
  await store.load();
  await store.update((s) => ({
    ...s,
    preferences: { ...s.preferences, language: "hi" },
    saved: [{ fact, savedAt: "2026-10-14T00:00:00Z" }],
  }));
  await render(wrapper(<SavedScreen />, store));
  await fireEvent.press(await screen.findByText("A surprising fact"));
  expect(
    await screen.findByText("इस सहेजे तथ्य का हिन्दी अनुवाद नहीं है।"),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "अंग्रेज़ी में पढ़ें" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Remove saved fact" }),
  );
  expect(await screen.findByText("अपनी पहली खोज सहेजें।")).toBeTruthy();
});
test("settings updates persisted appearance", async () => {
  let raw = "";
  const store = createAppStore({
    getItem: async () => null,
    setItem: async (_k, v) => {
      raw = v;
    },
  });
  await render(wrapper(<SettingsScreen />, store));
  await fireEvent.press(await screen.findByRole("button", { name: "Dark" }));
  await waitFor(() =>
    expect(JSON.parse(raw).preferences.appearance).toBe("dark"),
  );
});
test("sample preview is clearly labelled and never calls a live server", async () => {
  const fetcher = jest.fn();
  global.fetch = fetcher;
  await render(
    wrapper(
      <DiscoverScreen
        origin="https://example.org"
        previewFacts={[bilingual]}
      />,
    ),
  );
  expect(
    await screen.findByText("SAMPLE PREVIEW · NOT THE LIVE FEED"),
  ).toBeTruthy();
  expect(screen.getByText("A surprising fact")).toBeTruthy();
  expect(fetcher).not.toHaveBeenCalled();
});

test("two rapid remove presses cannot restore a saved fact", async () => {
  let finish!: () => void;
  let block = false;
  const store = createAppStore({
    getItem: async () => null,
    setItem: async () => {
      if (block)
        await new Promise<void>((r) => {
          finish = r;
        });
    },
  });
  await store.load();
  await store.update((s) => ({
    ...s,
    saved: [{ fact: bilingual, savedAt: "2026-10-14T00:00:00Z" }],
  }));
  await render(wrapper(<SavedScreen />, store));
  await fireEvent.press(await screen.findByText("A surprising fact"));
  block = true;
  const remove = screen.getByRole("button", { name: "Remove saved fact" });
  await fireEvent.press(remove);
  await fireEvent.press(remove);
  block = false;
  finish();
  await waitFor(() =>
    expect(screen.getByText("Keep your first discovery.")).toBeTruthy(),
  );
  expect((await store.load()).saved).toEqual([]);
});

test("large text has a scrollable page with reachable previous/next controls", async () => {
  const rn = require("react-native");
  jest
    .spyOn(rn, "useWindowDimensions")
    .mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 3.1 });
  await render(wrapper(<DiscoverScreen origin="https://example.org" />));
  await screen.findByText("A surprising fact");
  const page = screen.getByTestId("accessible-discover-scroll");
  expect(page.props.scrollEnabled).not.toBe(false);
  expect(screen.getByRole("adjustable").props.accessibilityActions).toContainEqual({name: "increment", label: "Next fact"});
  expect(screen.queryByRole("button", {name: "Next fact"})).toBeNull();
});

 test("love counts in Settings and music preferences persist", async () => {
  const store = createAppStore({getItem: async () => null, setItem: async () => {}});
  const view = await render(wrapper(<DiscoverScreen previewFacts={[bilingual]} />, store));
  await fireEvent.press(await screen.findByRole("button", {name: "Love fact"}));
  expect(await screen.findByRole("button", {name: "Unlike fact"})).toBeTruthy();
  expect((await store.load()).lovedIds).toEqual([bilingual.en.id]);
  await view.rerender(wrapper(<SettingsScreen />, store));
  expect(await screen.findByLabelText("Facts you love: 1")).toBeTruthy();
  await fireEvent(screen.getByRole("switch", {name: "Instrumental music"}), "valueChange", false);
  await waitFor(async () => expect((await store.load()).preferences.music).toBe(false));
 });

test("Hindi feed continues past consecutive pages without translations", async () => {
  const store = createAppStore({getItem: async () => null, setItem: async () => {}});
  await store.load();
  await store.update((s) => ({...s, preferences: {...s.preferences, language: "hi"}}));
  const page = (facts: unknown[], n: number | null) => ({ok: true, json: async () => ({version: 1, fetchedAt: "2026-10-14T00:00:00Z", facts, nextCursor: n === null ? null : `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`})});
  global.fetch = jest.fn()
    .mockResolvedValueOnce(page([bilingual], 1))
    .mockResolvedValueOnce(page([{en: {...fact.en, id: "two"}}], 2))
    .mockResolvedValueOnce(page([{en: {...fact.en, id: "three"}}], 3))
    .mockResolvedValueOnce(page([{en: {...bilingual.en, id: "four"}, hi: {...bilingual.hi!, id: "four", hook: "एक और खोज"}}], null));
  await render(wrapper(<DiscoverScreen origin="https://example.org" />, store));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));
  expect(await screen.findByText("एक और खोज")).toBeTruthy();
});

test("refresh uses corrected contents for existing fact IDs", async () => {
  const view = await render(wrapper(<DiscoverScreen previewFacts={[bilingual]} />));
  await screen.findByText("A surprising fact");
  await view.rerender(wrapper(<DiscoverScreen previewFacts={[{...bilingual, en: {...bilingual.en, hook: "Corrected fact"}}]} />));
  expect(await screen.findByText("Corrected fact")).toBeTruthy();
  expect(screen.queryByText("A surprising fact")).toBeNull();
});
