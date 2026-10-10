import { describe, expect, it } from "vitest";
import { commentaryForFeed, commentaryFromEvents } from "@/lib/game/commentary";
import {
  arrangeTestHands,
  drawFromDeck,
  playCards,
  takePreviousDiscard,
} from "@/lib/game/game-engine";
import { getPublicGameStateForPlayer } from "@/lib/game/projection";
import type { Card, GameLogEvent } from "@/lib/game/types";
import { card, makeGame, rng } from "./helpers";

const players = [
  { id: "sarah", nickname: "Sarah" },
  { id: "hugo", nickname: "Hugo" },
  { id: "alex", nickname: "Alex" },
];

function event(
  sequence: number,
  type: GameLogEvent["type"],
  actor: string | null,
  payload: Record<string, unknown> = {},
): GameLogEvent {
  return {
    id: `evt-${sequence}`,
    sequenceNumber: sequence,
    type,
    actorPlayerId: actor,
    payload,
    timestamp: sequence,
  };
}

const six: Card = { id: "deck1-hearts-6-006", rank: "6", suit: "hearts", color: "red" };

describe("commentary", () => {
  it("says who drew from the deck and never names that card", () => {
    const lines = commentaryFromEvents(
      [
        event(1, "PLAYER_DREW", "sarah", {
          source: "DECK",
          card: six,
          cardId: six.id,
          cards: [six],
        }),
      ],
      players,
    );
    expect(lines.map((line) => line.text)).toEqual(["Sarah drew from the deck."]);
    expect(lines[0]?.cards).toEqual([]);
    expect(lines[0]?.text).not.toContain("6");
    expect(lines[0]?.text).not.toContain("♥");
    expect(JSON.stringify(lines)).not.toContain(six.id);
  });

  it("names the exact public card taken from the previous discard", () => {
    const lines = commentaryFromEvents(
      [
        event(2, "PLAYER_TOOK_DISCARD", "sarah", {
          fromPlayerId: "hugo",
          cardId: six.id,
          card: six,
        }),
      ],
      players,
    );
    expect(lines[0]?.text).toBe("Sarah took the 6♥ from Hugo's discard.");
    expect(lines[0]?.cards.map((item) => item.id)).toEqual([six.id]);
    expect(lines[0]?.key).toBe("player_took_discard");
  });

  it("lists every public card in a discard", () => {
    const cards: Card[] = [
      { id: "a", rank: "5", suit: "hearts", color: "red" },
      { id: "b", rank: "6", suit: "hearts", color: "red" },
      { id: "c", rank: "7", suit: "hearts", color: "red" },
    ];
    const lines = commentaryFromEvents(
      [event(1, "PLAYER_PLAYED", "sarah", { cards, cardCount: 3 })],
      players,
    );
    expect(lines[0]?.text).toBe("Sarah discarded 5♥ 6♥ 7♥.");
    expect(lines[0]?.cards).toHaveLength(3);
  });

  it("narrates Carramba, elimination, and the winner", () => {
    const lines = commentaryFromEvents(
      [
        event(1, "CARAMBA_CALLED", "sarah", { success: true }),
        event(2, "PLAYER_ELIMINATED", "alex", { remaining: 2 }),
        event(3, "GAME_FINISHED", "hugo", { winnerId: "hugo" }),
      ],
      players,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Sarah called CARAMBA!",
      "Sarah's CARAMBA was successful!",
      "Alex was eliminated. 2 players remain.",
      "Hugo wins!",
    ]);
  });

  it("orders delayed events and drops duplicates", () => {
    const first = event(1, "TURN_STARTED", "sarah");
    const lines = commentaryFromEvents(
      [event(3, "PLAYER_DREW", "hugo"), first, { ...first, timestamp: 99 }, event(2, "PLAYER_PLAYED", "sarah", { cards: [six] })],
      players,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Sarah's turn.",
      "Sarah discarded 6♥.",
      "Hugo drew from the deck.",
    ]);
  });

  it("leaves turn prompts out of the compact feed", () => {
    const lines = commentaryForFeed(
      [
        event(1, "ROUND_STARTED", "sarah", { roundNumber: 1 }),
        event(2, "TURN_STARTED", "sarah"),
        event(3, "PLAYER_DREW", "sarah"),
        event(4, "ROUND_SCORED", null, { roundNumber: 1 }),
        event(5, "GAME_FINISHED", "hugo", { winnerId: "hugo" }),
      ],
      players,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Sarah drew from the deck.",
      "Round 1 ended.",
      "Hugo wins!",
    ]);
    expect(commentaryFromEvents(
      [event(2, "TURN_STARTED", "sarah")],
      players,
    ).map((line) => line.text)).toEqual(["Sarah's turn."]);
  });

  it("keeps only the recent window", () => {
    const events = Array.from({ length: 30 }, (_, index) =>
      event(index + 1, "TURN_STARTED", index === 0 ? "alex" : "sarah"),
    );
    const lines = commentaryFromEvents(events, players);
    expect(lines.some((line) => line.text.startsWith("Alex"))).toBe(false);
    expect(lines.at(-1)?.text).toBe("Sarah's turn.");
  });

  it("publishes the taken card and hides the drawn card", () => {
    let game = arrangeTestHands(makeGame(["Hugo", "Sarah"]), {
      "player-1": [card("hearts", "5", 1, 1), card("hearts", "6", 1, 2), card("hearts", "7", 1, 3)],
      "player-2": [card("clubs", "9", 1, 4), card("spades", "2", 1, 5)],
    });
    const secret = card("spades", "K", 2, 50);
    game = {
      ...game,
      currentPlayerId: "player-1",
      turnPhase: "DISCARD",
      drawPile: [secret],
    };
    game = playCards(game, "player-1", [
      "deck1-hearts-5-001",
      "deck1-hearts-6-002",
      "deck1-hearts-7-003",
    ]);
    game = drawFromDeck(game, "player-1", rng(1));
    const afterDraw = getPublicGameStateForPlayer(game, "player-2");
    const drew = afterDraw.events.find((entry) => entry.type === "PLAYER_DREW");
    expect(drew?.payload).toEqual({ source: "DECK" });
    expect(JSON.stringify(afterDraw.events)).not.toContain(secret.id);

    game = playCards(game, "player-2", ["deck1-clubs-9-004"]);
    game = takePreviousDiscard(game, "player-2", "deck1-hearts-6-002");
    const afterTake = getPublicGameStateForPlayer(game, "player-1");
    const taken = afterTake.events.find((entry) => entry.type === "PLAYER_TOOK_DISCARD");
    expect(taken?.payload.card).toMatchObject({ id: "deck1-hearts-6-002", rank: "6", suit: "hearts" });
    const lines = commentaryFromEvents(afterTake.events, afterTake.players);
    expect(lines.some((entry) => entry.text === "Sarah took the 6♥ from Hugo's discard.")).toBe(true);
    expect(lines.some((entry) => entry.text.includes(secret.rank) && entry.key === "player_drew_deck")).toBe(
      false,
    );
  });
});
