import { describe, expect, it } from "vitest";
import { validateDiscard, validateSameRankGroup, validateSequence } from "@/lib/game/validators";
import { card, redSequence9ToK } from "./helpers";

describe("same-rank groups", () => {
  it("accepts 2-5 cards of one rank", () => {
    expect(
      validateSameRankGroup([card("hearts", "7"), card("diamonds", "7")]),
    ).toMatchObject({ valid: true, type: "SAME_RANK" });
    expect(
      validateSameRankGroup([
        card("hearts", "7"),
        card("diamonds", "7"),
        card("clubs", "7"),
      ]),
    ).toMatchObject({ valid: true });
    expect(
      validateSameRankGroup([
        card("hearts", "7"),
        card("diamonds", "7"),
        card("clubs", "7"),
        card("spades", "7"),
      ]),
    ).toMatchObject({ valid: true });
    expect(
      validateDiscard([
        card("hearts", "Q"),
        card("spades", "Q"),
        card("clubs", "Q"),
      ]),
    ).toMatchObject({ valid: true, type: "SAME_RANK" });
  });

  it("rejects mixed ranks and oversized groups", () => {
    expect(
      validateSameRankGroup([card("hearts", "7"), card("diamonds", "8")]),
    ).toMatchObject({ valid: false, reason: "MIXED_RANKS" });
    expect(
      validateDiscard([
        card("hearts", "5", 1, 1),
        card("diamonds", "5", 1, 2),
        card("clubs", "5", 1, 3),
        card("spades", "5", 1, 4),
        card("hearts", "5", 2, 5),
        card("diamonds", "5", 2, 6),
      ]),
    ).toMatchObject({ valid: false, reason: "TOO_MANY_CARDS" });
  });
});

describe("sequences", () => {
  it("accepts same-color consecutive ranks including mixed suits", () => {
    expect(
      validateSequence([
        card("hearts", "9"),
        card("diamonds", "10"),
        card("hearts", "J"),
      ]),
    ).toMatchObject({ valid: true, type: "SEQUENCE" });
    expect(
      validateSequence([
        card("clubs", "10"),
        card("diamonds", "J"),
        card("clubs", "Q"),
        card("spades", "K"),
      ]),
    ).toMatchObject({ valid: false, reason: "SEQUENCE_MUST_HAVE_SAME_COLOR" });
    expect(
      validateSequence([
        card("clubs", "10"),
        card("spades", "J"),
        card("clubs", "Q"),
        card("spades", "K"),
      ]),
    ).toMatchObject({ valid: true, type: "SEQUENCE" });
    expect(
      validateSequence([
        card("hearts", "J"),
        card("diamonds", "Q"),
        card("hearts", "K"),
        card("diamonds", "A"),
      ]),
    ).toMatchObject({ valid: true, type: "SEQUENCE" });
  });

  it("accepts ace-low and ace-high, but never wraps", () => {
    expect(
      validateDiscard([
        card("hearts", "A"),
        card("diamonds", "2"),
        card("hearts", "3"),
      ]),
    ).toMatchObject({ valid: true, type: "SEQUENCE" });
    expect(
      validateDiscard([
        card("clubs", "Q"),
        card("spades", "K"),
        card("clubs", "A"),
      ]),
    ).toMatchObject({ valid: true, type: "SEQUENCE" });
    expect(
      validateDiscard([
        card("hearts", "K"),
        card("diamonds", "A"),
        card("hearts", "2"),
      ]),
    ).toMatchObject({ valid: false, reason: "SEQUENCE_CANNOT_WRAP" });
  });

  it("rejects mixed colors and duplicate ranks", () => {
    expect(
      validateSequence([
        card("hearts", "9"),
        card("clubs", "10"),
        card("hearts", "J"),
      ]),
    ).toMatchObject({
      valid: false,
      reason: "SEQUENCE_MUST_HAVE_SAME_COLOR",
    });
    expect(
      validateSequence([
        card("hearts", "9", 1, 1),
        card("diamonds", "9", 1, 2),
        card("hearts", "10"),
      ]),
    ).toMatchObject({ valid: false, reason: "SEQUENCE_DUPLICATE_RANK" });
  });

  it("accepts the mandatory five-card red sequence", () => {
    expect(validateDiscard(redSequence9ToK())).toMatchObject({
      valid: true,
      type: "SEQUENCE",
    });
  });
});
