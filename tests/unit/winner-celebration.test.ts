import { describe, expect, it } from "vitest";
import { winnerPhase } from "@/lib/ui/winner-celebration";

describe("winner celebration timing", () => {
  it("moves from the logo to the name, the podium, then the settled result", () => {
    expect(winnerPhase(0, false)).toBe("logo");
    expect(winnerPhase(1099, false)).toBe("logo");
    expect(winnerPhase(1100, false)).toBe("name");
    expect(winnerPhase(2099, false)).toBe("name");
    expect(winnerPhase(2100, false)).toBe("podium");
    expect(winnerPhase(3399, false)).toBe("podium");
    expect(winnerPhase(3400, false)).toBe("settled");
  });

  it("shows the finished result immediately when motion is reduced", () => {
    expect(winnerPhase(0, true)).toBe("settled");
  });
});