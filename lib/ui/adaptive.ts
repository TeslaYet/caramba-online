export type InputMode = "mouse" | "touch" | "hybrid";
export type LayoutMode = "desktop" | "tablet" | "mobile";
export type Orientation = "portrait" | "landscape";

export interface AdaptiveDevice {
  layoutMode: LayoutMode;
  inputMode: InputMode;
  isTouchDevice: boolean;
  hasHover: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
}

export const SERVER_DEVICE: AdaptiveDevice = {
  layoutMode: "desktop",
  inputMode: "mouse",
  isTouchDevice: false,
  hasHover: true,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  orientation: "landscape",
};

export function classifyDevice(input: {
  width: number;
  coarsePointer: boolean;
  finePointer: boolean;
  hover: boolean;
  maxTouchPoints: number;
  portrait: boolean;
}): AdaptiveDevice {
  const layoutMode: LayoutMode =
    input.width < 640 ? "mobile" : input.width < 1024 ? "tablet" : "desktop";
  const touch = input.maxTouchPoints > 0 || input.coarsePointer;
  let inputMode: InputMode = "mouse";
  if (input.coarsePointer && !input.hover) {
    inputMode = "touch";
  } else if (touch && (input.finePointer || input.hover)) {
    inputMode = "hybrid";
  } else if (input.coarsePointer) {
    inputMode = "touch";
  }

  return {
    layoutMode,
    inputMode,
    isTouchDevice: touch,
    hasHover: input.hover,
    isMobile: layoutMode === "mobile",
    isTablet: layoutMode === "tablet",
    isDesktop: layoutMode === "desktop",
    orientation: input.portrait ? "portrait" : "landscape",
  };
}
