import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FactPager } from "./FactPager";
import { bilingual } from "../test/fixtures";
jest.mock("../theme", () => ({
  useAppTheme: () => ({
    bg: "#fff",
    card: "#fff",
    ink: "#111",
    muted: "#555",
    accent: "#7050a0",
    tint: "#eee",
    border: "#ddd",
    reduceMotion: false,
  }),
}));
test("native vertical paging selects the settled page with complete text and no extra reading controls", async () => {
  const onIndexChange = jest.fn();
  const facts = [
    bilingual.en,
    { ...bilingual.en, id: "second", hook: "Second discovery" },
  ];
  await render(
    <FactPager
      facts={facts}
      index={0}
      language="en"
      savedIds={[]}
      onIndexChange={onIndexChange}
      onSave={() => {}}
      onShare={() => {}}
      onSource={() => {}}
    />,
  );
  await fireEvent(screen.getByTestId("vertical-fact-pager"), "layout", {
    nativeEvent: { layout: { width: 390, height: 600 } },
  });
  const list = screen.getByTestId("vertical-fact-list");
  expect(list.props.pagingEnabled).toBe(true);
  expect(list.props.horizontal).not.toBe(true);
  await fireEvent(list, "momentumScrollEnd", {
    nativeEvent: { contentOffset: { y: 600 } },
  });
  expect(onIndexChange).toHaveBeenCalledWith(1);
  expect(screen.queryAllByRole("button", { name: "Read full fact" })).toHaveLength(0);
  expect(screen.queryAllByRole("button", { name: "Sources" })).toHaveLength(0);
  expect(screen.getAllByText(bilingual.en.body)[0]!.props.numberOfLines).toBeUndefined();
});
