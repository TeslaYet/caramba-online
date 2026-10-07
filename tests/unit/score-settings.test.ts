import { describe, expect, it } from "vitest";
import { arrangeTestHands, callCaramba } from "@/lib/game/game-engine";
import { applyScoreLimit } from "@/lib/game/scoring";
import { parseScoreSettings } from "@/lib/game/score-settings";
import { card, makeGame } from "./helpers";

describe("configurable score limit", () => {
  it("keeps the default 100 to 50 reset", () => {
    expect(applyScoreLimit(100, 100, 50)).toEqual({
      score: 50,
      hitExactHundred: true,
      eliminated: false,
    });
    expect(applyScoreLimit(101, 100, 50).eliminated).toBe(true);
    expect(applyScoreLimit(99, 100, 50).score).toBe(99);
  });

  it("resets an exact custom maximum and eliminates anything above it", () => {
    expect(applyScoreLimit(50, 50, 25)).toEqual({
      score: 25,
      hitExactHundred: true,
      eliminated: false,
    });
    expect(applyScoreLimit(53, 50, 25)).toMatchObject({ score: 53, eliminated: true });
    expect(applyScoreLimit(150, 150, 75).score).toBe(75);
    expect(applyScoreLimit(149, 150, 75)).toMatchObject({ score: 149, eliminated: false });
  });

  it("rejects a reset score that is not below the maximum", () => {
    expect(() => parseScoreSettings(100, 100)).toThrow(/lower than the maximum/);
    expect(() => parseScoreSettings(100, 0)).toThrow(/greater than 0/);
  });

  it("applies the table maximum inside the engine", () => {
    let game = arrangeTestHands(makeGame(["Ada", "Bea", "Cid"]), {
      "player-1": [card("hearts", "A")],
      "player-2": [card("clubs", "2")],
      "player-3": [card("spades", "5")],
    });
    game = {
      ...game,
      maxScore: 50,
      resetScore: 25,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      players: game.players.map((player) => ({ ...player, totalScore: 48 })),
    };
    game = callCaramba(game, "player-1");
    expect(game.players[0]?.totalScore).toBe(48);
    expect(game.players[1]?.totalScore).toBe(25);
    expect(game.players[1]?.eliminated).toBe(false);
    expect(game.players[2]?.eliminated).toBe(true);
    expect(game.players[2]?.totalScore).toBe(53);
  });
});
