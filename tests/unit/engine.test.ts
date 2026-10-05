import { describe, expect, it } from "vitest";
import {
  arrangeTestHands,
  callCaramba,
  canPlayCards,
  drawFromDeck,
  GameEngineError,
  playCards,
  takePreviousDiscard,
} from "@/lib/game/game-engine";
import { getPublicGameStateForPlayer } from "@/lib/game/projection";
import { calculateHandScore } from "@/lib/game/scoring";
import { getNextActivePlayer } from "@/lib/game/turn-manager";
import { validateDiscard } from "@/lib/game/validators";
import { card, makeGame, redSequence9ToK, rng } from "./helpers";

describe("full-hand discard", () => {
  it("allows discarding a 5-card sequence then drawing back to 1", () => {
    const hand = redSequence9ToK();
    expect(validateDiscard(hand)).toMatchObject({ valid: true, type: "SEQUENCE" });

    let game = arrangeTestHands(makeGame(), {
      "player-1": hand,
      "player-2": [
        card("clubs", "2"),
        card("clubs", "4"),
        card("clubs", "6"),
        card("clubs", "8"),
        card("clubs", "A"),
      ],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [card("spades", "3", 2, 40), ...game.drawPile],
    };

    expect(canPlayCards(game, "player-1", hand.map((item) => item.id))).toEqual({
      ok: true,
    });

    game = playCards(
      game,
      "player-1",
      hand.map((item) => item.id),
    );
    expect(game.players[0]?.hand).toHaveLength(0);
    expect(game.turnPhase).toBe("DRAW");

    game = drawFromDeck(game, "player-1", rng(2));
    expect(game.players[0]?.hand).toHaveLength(1);
    expect(game.turnPhase).toBe("DISCARD");
    expect(game.currentPlayerId).toBe("player-2");
  });

  it("allows discarding 4 sequence cards then drawing to 1", () => {
    const hand = [
      card("hearts", "9"),
      card("diamonds", "10"),
      card("hearts", "J"),
      card("diamonds", "Q"),
    ];
    let game = arrangeTestHands(makeGame(), {
      "player-1": hand,
      "player-2": [card("clubs", "2"), card("spades", "5")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [card("spades", "A", 2, 41)],
    };
    game = playCards(
      game,
      "player-1",
      hand.map((item) => item.id),
    );
    game = drawFromDeck(game, "player-1", rng(1));
    expect(game.players[0]?.hand).toHaveLength(1);
  });

  it("allows discarding a pair then drawing to 1", () => {
    const hand = [card("hearts", "8"), card("spades", "8")];
    let game = arrangeTestHands(makeGame(), {
      "player-1": hand,
      "player-2": [card("clubs", "2"), card("spades", "5")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [card("diamonds", "A", 2, 42)],
    };
    game = playCards(
      game,
      "player-1",
      hand.map((item) => item.id),
    );
    game = drawFromDeck(game, "player-1", rng(1));
    expect(game.players[0]?.hand).toHaveLength(1);
  });
});

describe("turns and pickup", () => {
  it("progresses clockwise and skips eliminated players", () => {
    let game = makeGame(["Hugo", "Alex", "Sarah"]);
    game = {
      ...game,
      players: game.players.map((player) =>
        player.id === "player-2" ? { ...player, eliminated: true } : player,
      ),
      currentPlayerId: "player-1",
    };
    const next = getNextActivePlayer(game, "player-1");
    expect(next?.id).toBe("player-3");
    expect(getNextActivePlayer(game, "player-3")?.id).toBe("player-1");
  });

  it("lets the next player take one card from the previous discard", () => {
    let game = arrangeTestHands(makeGame(), {
      "player-1": [card("hearts", "4"), card("diamonds", "5"), card("hearts", "6")],
      "player-2": [card("clubs", "9"), card("spades", "2")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [card("spades", "K", 2, 50)],
    };
    game = playCards(game, "player-1", [
      "deck1-hearts-4-001",
      "deck1-diamonds-5-001",
      "deck1-hearts-6-001",
    ]);
    game = drawFromDeck(game, "player-1", rng(1));
    expect(game.currentPlayerId).toBe("player-2");

    game = playCards(game, "player-2", ["deck1-clubs-9-001"]);
    const taken = takePreviousDiscard(game, "player-2", "deck1-diamonds-5-001");
    expect(taken.players[1]?.hand.some((item) => item.id === "deck1-diamonds-5-001")).toBe(
      true,
    );
    expect(
      taken.discardHistory.at(-1)?.cards.some((item) => item.id === "deck1-diamonds-5-001"),
    ).toBe(false);
    expect(taken.players[1]?.hand.length).toBeGreaterThanOrEqual(1);
  });

  it("rebuilds an empty draw pile from older discards", () => {
    let game = arrangeTestHands(makeGame(), {
      "player-1": [card("hearts", "3"), card("spades", "9")],
      "player-2": [card("clubs", "4"), card("diamonds", "8")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [],
      discardHistory: [
        {
          id: "old-1",
          playerId: "player-2",
          cards: [card("hearts", "K", 2, 70), card("clubs", "Q", 2, 71)],
          turnNumber: 1,
          timestamp: 1,
          pickupEligible: false,
        },
        {
          id: "elig-1",
          playerId: "player-2",
          cards: [card("diamonds", "2", 2, 72)],
          turnNumber: 2,
          timestamp: 2,
          pickupEligible: true,
        },
      ],
    };
    game = playCards(game, "player-1", ["deck1-hearts-3-001"]);
    game = drawFromDeck(game, "player-1", rng(4));
    expect(game.players[0]?.hand).toHaveLength(2);
    expect(
      game.discardHistory.some((group) =>
        group.cards.some((item) => item.id === "deck1-hearts-3-001"),
      ),
    ).toBe(true);
    const recycled = new Set([
      "deck2-hearts-K-070",
      "deck2-clubs-Q-071",
      "deck2-diamonds-2-072",
    ]);
    const drawn = game.players[0]?.hand.find((item) => recycled.has(item.id));
    expect(drawn).toBeTruthy();
    const stillOut = [
      ...game.drawPile.map((item) => item.id),
      ...game.discardHistory.flatMap((group) => group.cards.map((item) => item.id)),
      drawn!.id,
    ];
    expect(stillOut.filter((id) => recycled.has(id))).toHaveLength(3);
  });
});

describe("caramba and scoring", () => {
  it("awards 0 when the caller is strictly lowest", () => {
    let game = arrangeTestHands(makeGame(["Alice", "Bob", "Charles", "David"]), {
      "player-1": [card("hearts", "A"), card("hearts", "3")],
      "player-2": [card("clubs", "7")],
      "player-3": [card("spades", "Q"), card("spades", "2")],
      "player-4": [card("diamonds", "K"), card("diamonds", "9")],
    });
    game = { ...game, currentPlayerId: "player-1", turnPhase: "DISCARD" };
    game = callCaramba(game, "player-1");
    expect(game.roundResult?.success).toBe(true);
    expect(game.players[0]?.lastRoundScore).toBe(0);
    expect(game.players[0]?.totalScore).toBe(0);
    expect(game.players[1]?.lastRoundScore).toBe(7);
  });

  it("penalizes a tied lowest call", () => {
    let game = arrangeTestHands(makeGame(["Alice", "Bob", "Charles"]), {
      "player-1": [card("hearts", "7")],
      "player-2": [card("clubs", "7")],
      "player-3": [card("spades", "Q"), card("spades", "2")],
    });
    game = { ...game, currentPlayerId: "player-1", turnPhase: "DISCARD" };
    game = callCaramba(game, "player-1");
    expect(game.roundResult?.success).toBe(false);
    expect(game.roundResult?.reason).toBe("TIED_LOWEST");
    expect(game.players[0]?.lastRoundScore).toBe(37);
  });

  it("penalizes a caller who is not lowest", () => {
    let game = arrangeTestHands(makeGame(["Alice", "Bob", "Charles"]), {
      "player-1": [card("hearts", "6")],
      "player-2": [card("clubs", "4")],
      "player-3": [card("spades", "9"), card("spades", "6")],
    });
    game = { ...game, currentPlayerId: "player-1", turnPhase: "DISCARD" };
    game = callCaramba(game, "player-1");
    expect(game.roundResult?.reason).toBe("NOT_LOWEST");
    expect(game.players[0]?.lastRoundScore).toBe(36);
  });

  it("rejects Carramba when the hand is above 7", () => {
    const game = {
      ...arrangeTestHands(makeGame(), {
        "player-1": [card("hearts", "8")],
        "player-2": [card("clubs", "9")],
      }),
      currentPlayerId: "player-1",
      turnPhase: "DISCARD" as const,
    };
    expect(() => callCaramba(game, "player-1")).toThrow(GameEngineError);
    expect(() => callCaramba(game, "player-1")).toThrow(/7 or less/);
  });

  it("applies the 100 rule and elimination after a round", () => {
    let game = arrangeTestHands(makeGame(["Hugo", "Alex"]), {
      "player-1": [card("hearts", "A")],
      "player-2": [card("clubs", "A")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      players: game.players.map((player) =>
        player.id === "player-2" ? { ...player, totalScore: 99 } : player,
      ),
    };
    game = callCaramba(game, "player-1");
    expect(game.players[1]?.totalScore).toBe(50);

    game = arrangeTestHands(makeGame(["Hugo", "Alex"]), {
      "player-1": [card("hearts", "A")],
      "player-2": [card("clubs", "2")],
    });
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      players: game.players.map((player) =>
        player.id === "player-2" ? { ...player, totalScore: 99 } : player,
      ),
    };
    game = callCaramba(game, "player-1");
    expect(game.players[1]?.eliminated).toBe(true);
    expect(game.status).toBe("GAME_OVER");
    expect(game.winnerId).toBe("player-1");
  });
});

describe("projection", () => {
  it("never sends another player's hidden cards while playing", () => {
    const game = makeGame();
    const view = getPublicGameStateForPlayer(game, "player-1");
    expect(view.me?.hand).toHaveLength(5);
    expect(view.players.find((player) => player.id === "player-2")?.hand).toBeNull();
    expect(view.drawPileCount).toBe(game.drawPile.length);
    expect("drawPile" in view).toBe(false);
  });

  it("reveals hands after Carramba", () => {
    let game = arrangeTestHands(makeGame(), {
      "player-1": [card("hearts", "A")],
      "player-2": [card("clubs", "9")],
    });
    game = callCaramba(
      { ...game, currentPlayerId: "player-1", turnPhase: "DISCARD" },
      "player-1",
    );
    const view = getPublicGameStateForPlayer(game, "player-1");
    expect(view.players[1]?.hand).toEqual([card("clubs", "9")]);
    expect(calculateHandScore(view.players[1]?.hand ?? [])).toBe(9);
  });
});
