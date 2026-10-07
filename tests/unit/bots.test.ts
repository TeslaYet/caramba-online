import { describe, expect, it } from "vitest";
import { chooseBotAction, botView } from "@/lib/game/bots";
import { viewForBot } from "@/lib/game/bot-runner";
import { validateDiscard } from "@/lib/game/validators";
import { arrangeTestHands } from "@/lib/game/game-engine";
import { card, makeGame } from "./helpers";

describe("bots", () => {
  it("chooses a legal action from its own cards at every difficulty", () => {
    const hand = [card("hearts", "K"), card("clubs", "4"), card("spades", "4")];
    const view = botView({
      phase: "DISCARD",
      selfHand: hand,
      opponents: [{ cardCount: 5 }, { cardCount: 5 }],
      eligibleDiscard: null,
    });
    for (const difficulty of ["easy", "normal", "hard", "expert"] as const) {
      const action = chooseBotAction(view, difficulty, () => 0.99);
      expect(action.type === "PLAY_CARDS" || action.type === "CALL_CARAMBA").toBe(true);
      if (action.type === "PLAY_CARDS") {
        expect(action.cardIds.every((id) => hand.some((item) => item.id === id))).toBe(true);
        expect(validateDiscard(hand.filter((item) => action.cardIds.includes(item.id))).valid).toBe(true);
      }
    }
  });

  it("does not receive hidden opponent cards", () => {
    const secret = card("diamonds", "Q", 2, 4);
    const game = arrangeTestHands(makeGame(["Ada", "Bea"]), {
      "player-1": [card("hearts", "9"), card("hearts", "3")],
      "player-2": [secret, card("clubs", "8", 2, 5)],
    });
    const view = viewForBot({ ...game, currentPlayerId: "player-1", turnPhase: "DISCARD" }, "player-1");
    expect(JSON.stringify(view)).not.toContain(secret.id);
    expect(view.opponentCardCounts).toEqual([2]);
    expect(view.selfHand.map((item) => item.id)).not.toContain(secret.id);
  });

  it("can take a public discard without seeing the deck order", () => {
    const discard = card("hearts", "A", 2, 9);
    const view = botView({
      phase: "DRAW",
      selfHand: [card("clubs", "K")],
      opponents: [{ cardCount: 4 }],
      eligibleDiscard: [discard],
    });
    const action = chooseBotAction(view, "normal", () => 0);
    expect(action).toEqual({ type: "TAKE_FROM_PREVIOUS_DISCARD", cardId: discard.id });
  });
});
