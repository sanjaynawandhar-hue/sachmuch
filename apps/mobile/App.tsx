import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "./src/state/AppStateProvider";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { MusicPlayer } from "./src/components/MusicPlayer";
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <MusicPlayer />
          <AppNavigator />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
