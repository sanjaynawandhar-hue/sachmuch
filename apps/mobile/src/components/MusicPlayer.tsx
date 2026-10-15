import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useAppState } from "../state/AppStateProvider";

export function MusicPlayer() {
  const { state } = useAppState();
  const player = useAudioPlayer(require("../../assets/music/wonder.wav"));
  const [active, setActive] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
    }).then(() => { if (mounted) setReady(true); }).catch(() => {});
    const subscription = AppState.addEventListener("change", (value) => setActive(value === "active"));
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    player.loop = true;
    player.volume = state.preferences.musicVolume;
    if (ready && active && state.preferences.music) player.play();
    else player.pause();
  }, [player, ready, active, state.preferences.music, state.preferences.musicVolume]);
  return null;
}
