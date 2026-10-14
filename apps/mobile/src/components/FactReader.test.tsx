import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FactReader } from "./FactReader";
import { SourceSheet } from "./SourceSheet";
import { AppStateProvider } from "../state/AppStateProvider";
import { createAppStore } from "../state/storage";
import { bilingual } from "../test/fixtures";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: async () => null,
  setItem: async () => {},
}));
const wrap = (child: React.ReactNode) => (
  <AppStateProvider
    store={createAppStore({
      getItem: async () => null,
      setItem: async () => {},
    })}
  >
    {child}
  </AppStateProvider>
);
test("readable fact exposes source, saved state, and actions", async () => {
  const save = jest.fn();
  await render(
    wrap(
      <FactReader
        fact={bilingual.en}
        language="en"
        saved
        onSave={save}
        onShare={() => {}}
        onSource={() => {}}
      />,
    ),
  );
  await screen.findByText("A surprising fact");
  expect(screen.getByText("Example publisher")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Remove saved fact" }),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Remove saved fact" }),
  );
  expect(save).toHaveBeenCalledTimes(1);
});
test("Hindi content and controls are labelled in Hindi", async () => {
  await render(
    wrap(
      <FactReader
        fact={bilingual.hi!}
        language="hi"
        saved={false}
        onSave={() => {}}
        onShare={() => {}}
        onSource={() => {}}
      />,
    ),
  );
  expect(await screen.findByText("एक रोचक तथ्य")).toBeTruthy();
  expect(screen.getByRole("button", { name: "तथ्य सहेजें" })).toBeTruthy();
});
test("source sheet shows attribution and can be dismissed", async () => {
  const close = jest.fn();
  await render(
    wrap(
      <SourceSheet
        fact={{ ...bilingual.en, attributionText: "Original author" }}
        onClose={close}
      />,
    ),
  );
  expect(await screen.findByText("Original author")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(close).toHaveBeenCalledTimes(1);
});
