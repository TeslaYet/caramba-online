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

type Preferences = {
  sound: boolean;
  reduceMotion: boolean;
  setSound: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  playSound: (kind: SoundKind) => void;
};

export type SoundKind =
  | "select"
  | "draw"
  | "discard"
  | "turn"
  | "caramba"
  | "result"
  | "eliminate"
  | "victory";

const PreferencesContext = createContext<Preferences | null>(null);

function beep(frequency: number, duration: number, type: OscillatorType = "sine") {
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.stop(audio.currentTime + duration);
  window.setTimeout(() => void audio.close(), duration * 1000 + 80);
}

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
        if (!sound) {
          return;
        }
        const map: Record<SoundKind, () => void> = {
          select: () => beep(640, 0.06, "triangle"),
          draw: () => beep(420, 0.1, "sine"),
          discard: () => beep(280, 0.12, "sawtooth"),
          turn: () => beep(520, 0.16, "square"),
          caramba: () => {
            beep(360, 0.18, "triangle");
            window.setTimeout(() => beep(540, 0.2, "triangle"), 90);
          },
          result: () => beep(480, 0.2, "sine"),
          eliminate: () => beep(180, 0.25, "sawtooth"),
          victory: () => {
            beep(523, 0.15);
            window.setTimeout(() => beep(659, 0.15), 120);
            window.setTimeout(() => beep(784, 0.25), 240);
          },
        };
        map[kind]();
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
