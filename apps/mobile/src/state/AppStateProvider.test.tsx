import React from "react";
import { Text, Button } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { AppStateProvider, useAppState } from "./AppStateProvider";
import { createAppStore } from "./storage";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: async () => null,
  setItem: async () => {},
}));
function Reader() {
  const { state, setPreferences } = useAppState();
  return (
    <>
      <Text>{state.preferences.language}</Text>
      <Button
        title="Hindi"
        onPress={() => {
          void setPreferences({ language: "hi" });
        }}
      />
    </>
  );
}
test("waits for hydration before showing reader and changes language persistently", async () => {
  let finish!: (v: string | null) => void;
  let raw: string | null = null;
  const store = createAppStore({
    getItem: () =>
      new Promise((r) => {
        finish = r;
      }),
    setItem: async (_k, v) => {
      raw = v;
    },
  });
  await render(
    <AppStateProvider store={store}>
      <Reader />
    </AppStateProvider>,
  );
  expect(screen.queryByText("en")).toBeNull();
  finish(null);
  await waitFor(() => expect(screen.getByText("en")).toBeTruthy());
  await fireEvent.press(screen.getByText("Hindi"));
  await waitFor(() => expect(screen.getByText("hi")).toBeTruthy());
  expect(JSON.parse(raw!).preferences.language).toBe("hi");
});
test("storage read failure offers retry without rendering default reader", async () => {
  const store = createAppStore({
    getItem: async () => {
      throw Error("read failed");
    },
    setItem: async () => {},
  });
  await render(
    <AppStateProvider store={store}>
      <Reader />
    </AppStateProvider>,
  );
  await waitFor(() => expect(screen.getByText(/Retry/)).toBeTruthy());
  expect(screen.queryByText("en")).toBeNull();
});
test("unmount before hydration does not mount children", async () => {
  let finish!: (v: string | null) => void;
  const store = createAppStore({
    getItem: () =>
      new Promise((r) => {
        finish = r;
      }),
    setItem: async () => {},
  });
  const view = await render(
    <AppStateProvider store={store}>
      <Reader />
    </AppStateProvider>,
  );
  await view.unmount();
  finish(null);
  expect(screen.queryByText("en")).toBeNull();
});
test('love toggles persist once and survive hydration', async () => {
 let raw: string|null=null;
 const adapter={getItem:async()=>raw,setItem:async(_k:string,v:string)=>{raw=v;}};
 function Love(){const {state,toggleLoved}=useAppState();return <><Text>{`Loved: ${state.lovedIds.length}`}</Text><Button title="Love" onPress={()=>{void toggleLoved('one');}} /></>;}
 await render(<AppStateProvider store={createAppStore(adapter)}><Love /></AppStateProvider>);
 await fireEvent.press(await screen.findByText('Love'));
 await waitFor(()=>expect(screen.getByText('Loved: 1')).toBeTruthy());
 expect((await createAppStore(adapter).load()).lovedIds).toEqual(['one']);
 await fireEvent.press(screen.getByText('Love'));
 await waitFor(()=>expect(screen.getByText('Loved: 0')).toBeTruthy());
});
