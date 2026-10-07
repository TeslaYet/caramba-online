"use client";

import { useSyncExternalStore } from "react";
import { SERVER_DEVICE, classifyDevice, type AdaptiveDevice } from "@/lib/ui/adaptive";

function subscribe(onChange: () => void) {
  const queries = ["(pointer: coarse)", "(pointer: fine)", "(hover: hover)", "(orientation: portrait)"].map(
    (query) => window.matchMedia(query),
  );
  queries.forEach((query) => query.addEventListener("change", onChange));
  window.addEventListener("resize", onChange);
  return () => {
    queries.forEach((query) => query.removeEventListener("change", onChange));
    window.removeEventListener("resize", onChange);
  };
}

let cachedKey = "";
let cachedDevice = SERVER_DEVICE;

function readDevice(): AdaptiveDevice {
  const next = classifyDevice({
    width: window.innerWidth,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    finePointer: window.matchMedia("(pointer: fine)").matches,
    hover: window.matchMedia("(hover: hover)").matches,
    maxTouchPoints: navigator.maxTouchPoints,
    portrait: window.matchMedia("(orientation: portrait)").matches,
  });
  const key = JSON.stringify(next);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedDevice = next;
  }
  return cachedDevice;
}

export function useAdaptiveDevice(): AdaptiveDevice {
  return useSyncExternalStore(subscribe, readDevice, () => SERVER_DEVICE);
}
