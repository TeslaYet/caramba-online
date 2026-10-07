import { describe, expect, it } from "vitest";
import { showdownFacesVisible, showdownPhase } from "@/lib/ui/carramba-showdown";

describe("Carramba showdown timing", () => {
  it("announces, reveals, holds, then shows the result", () => {
    expect(showdownPhase(0, false)).toBe("announce");
    expect(showdownPhase(1099, false)).toBe("announce");
    expect(showdownPhase(1100, false)).toBe("reveal");
    expect(showdownPhase(2499, false)).toBe("reveal");
    expect(showdownPhase(2500, false)).toBe("hold");
    expect(showdownPhase(4199, false)).toBe("hold");
    expect(showdownPhase(4200, false)).toBe("result");
  });

  it("keeps the same information with a short reduced-motion sequence", () => {
    expect(showdownPhase(0, true)).toBe("announce");
    expect(showdownPhase(280, true)).toBe("hold");
    expect(showdownPhase(720, true)).toBe("result");
  });

  it("hides faces until the reveal beat", () => {
    expect(showdownFacesVisible("announce")).toBe(false);
    expect(showdownFacesVisible(null)).toBe(false);
    expect(showdownFacesVisible("reveal")).toBe(true);
    expect(showdownFacesVisible("hold")).toBe(true);
    expect(showdownFacesVisible("result")).toBe(true);
  });
});