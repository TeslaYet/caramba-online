import { describe, expect, it } from "vitest";
import { fanSpan, fanStep, hiddenPlaceholders, seatSide } from "@/lib/ui/hidden-hand";

describe("hidden opponent hands", () => {
  it("builds visual placeholders from the count only", () => {
    const cards = hiddenPlaceholders("player-2", 5);
    expect(cards).toEqual([
      { id: "player-2-hidden-0" },
      { id: "player-2-hidden-1" },
      { id: "player-2-hidden-2" },
      { id: "player-2-hidden-3" },
      { id: "player-2-hidden-4" },
    ]);
    expect(cards.every((card) => !("rank" in card) && !("suit" in card))).toBe(true);
  });

  it("keeps a large fan inside the seat span", () => {
    const step = fanStep(12, 32, 112);
    expect(fanSpan(12, 32, step)).toBeLessThanOrEqual(112);
  });

  it("places seats by the side of the table they occupy", () => {
    expect(seatSide(90)).toBe("right");
    expect(seatSide(270)).toBe("left");
    expect(seatSide(0)).toBe("top");
    expect(seatSide(180)).toBe("bottom");
  });
});