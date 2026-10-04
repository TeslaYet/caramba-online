import { describe, expect, it } from "vitest";
import { apply100PointRule, calculateHandScore, getCardValue } from "@/lib/game/scoring";
import { RANKS } from "@/lib/game/types";
import { card } from "./helpers";

describe("card values", () => {
  it("scores every rank from the central table", () => {
    const expected: Record<(typeof RANKS)[number], number> = {
      A: 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 10,
      Q: 10,
      K: 10,
    };

    for (const rank of RANKS) {
      expect(getCardValue(card("hearts", rank))).toBe(expected[rank]);
    }
  });

  it("keeps Ace worth 1 even at the end of J Q K A", () => {
    expect(
      calculateHandScore([
        card("hearts", "J"),
        card("hearts", "Q"),
        card("hearts", "K"),
        card("hearts", "A"),
      ]),
    ).toBe(31);
  });
});

describe("100-point rule", () => {
  it("resets exactly 100 to 50", () => {
    expect(apply100PointRule(99 + 1)).toEqual({
      score: 50,
      hitExactHundred: true,
      eliminated: false,
    });
  });

  it("eliminates scores above 100", () => {
    expect(apply100PointRule(99 + 2)).toEqual({
      score: 101,
      hitExactHundred: false,
      eliminated: true,
    });
  });
});
