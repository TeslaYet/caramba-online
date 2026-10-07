"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { playCue, unlockAudio, type SoundCue } from "@/lib/ui/audio";

type Preferences = {
  sound: boolean;
  reduceMotion: boolean;
  setSound: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  playSound: (kind: SoundKind) => void;
};

export type SoundKind = SoundCue;

const PreferencesContext = createContext<Preferences | null>(null);

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const storedSound = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem("caramba-sound") !== "off",
    () => true,
  );
  const storedMotion = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem("caramba-motion") === "reduce",
    () => false,
  );
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const sound = soundOverride ?? storedSound;
  const reduceMotion = motionOverride ?? storedMotion;

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const value = useMemo<Preferences>(
    () => ({
      sound,
      reduceMotion,
      setSound: (next) => {
        setSoundOverride(next);
        localStorage.setItem("caramba-sound", next ? "on" : "off");
      },
      setReduceMotion: (next) => {
        setMotionOverride(next);
        localStorage.setItem("caramba-motion", next ? "reduce" : "full");
      },
      playSound: (kind) => {
        playCue(kind, sound);
      },
    }),
    [sound, reduceMotion],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("PreferencesProvider is missing.");
  }
  return value;
}
