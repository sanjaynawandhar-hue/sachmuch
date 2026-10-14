import React from "react";
import {
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
  await fireEvent.scroll(screen.getByTestId("fact-body"), {
    nativeEvent: { contentOffset: { y: 80 } },
  });
  expect(screen.getByText("A surprising fact")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Next fact" }));
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
