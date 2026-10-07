import { describe, expect, it } from "vitest";
import { classifyDevice } from "@/lib/ui/adaptive";

describe("classifyDevice", () => {
  it("treats a mouse desktop as a fine pointer with hover", () => {
    const device = classifyDevice({
      width: 1440,
      coarsePointer: false,
      finePointer: true,
      hover: true,
      maxTouchPoints: 0,
      portrait: false,
    });
    expect(device).toMatchObject({
      layoutMode: "desktop",
      inputMode: "mouse",
      isDesktop: true,
      hasHover: true,
    });
  });

  it("treats a narrow coarse screen as a touch phone", () => {
    const device = classifyDevice({
      width: 390,
      coarsePointer: true,
      finePointer: false,
      hover: false,
      maxTouchPoints: 5,
      portrait: true,
    });
    expect(device).toMatchObject({
      layoutMode: "mobile",
      inputMode: "touch",
      isMobile: true,
      orientation: "portrait",
    });
  });

  it("treats a medium touch screen as a tablet", () => {
    const device = classifyDevice({
      width: 768,
      coarsePointer: true,
      finePointer: false,
      hover: false,
      maxTouchPoints: 5,
      portrait: true,
    });
    expect(device.layoutMode).toBe("tablet");
    expect(device.inputMode).toBe("touch");
  });

  it("keeps a touch laptop on the desktop layout with hybrid input", () => {
    const device = classifyDevice({
      width: 1280,
      coarsePointer: false,
      finePointer: true,
      hover: true,
      maxTouchPoints: 10,
      portrait: false,
    });
    expect(device).toMatchObject({
      layoutMode: "desktop",
      inputMode: "hybrid",
      isTouchDevice: true,
      hasHover: true,
    });
  });
});
