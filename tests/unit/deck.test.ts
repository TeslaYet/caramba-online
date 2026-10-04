import { describe, expect, it } from "vitest";
import { createCard } from "@/lib/game/cards";
import { createDeck, createShuffledDeck, shuffleDeck } from "@/lib/game/deck";
import { startNextRound, startRound } from "@/lib/game/game-engine";
import { GAME_RULES } from "@/lib/game/rules";
import { RANKS, SUITS } from "@/lib/game/types";
import { makeGame, rng } from "./helpers";

describe("deck", () => {
  it("creates exactly 104 physical cards and no jokers", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(GAME_RULES.CARD_DECK_SIZE);
    expect(deck.every((card) => RANKS.includes(card.rank))).toBe(true);
    expect(deck.some((card) => card.id.toLowerCase().includes("joker"))).toBe(
      false,
    );
  });

  it("contains exactly two copies of every rank and suit", () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const copies = deck.filter(
          (card) => card.suit === suit && card.rank === rank,
        );
        expect(copies).toHaveLength(2);
        expect(new Set(copies.map((card) => card.id)).size).toBe(2);
      }
    }
  });

  it("uses distinct physical ids for duplicate faces", () => {
    const first = createCard(1, "hearts", "A", 1);
    const second = createCard(2, "hearts", "A", 2);
    expect(first.id).toBe("deck1-hearts-A-001");
    expect(second.id).toBe("deck2-hearts-A-002");
    expect(first.id).not.toBe(second.id);
  });

  it("shuffles the complete deck without dropping cards", () => {
    const original = createDeck();
    const shuffled = shuffleDeck(original, rng(99));
    expect(shuffled).toHaveLength(original.length);
    expect(new Set(shuffled.map((card) => card.id))).toEqual(
      new Set(original.map((card) => card.id)),
    );
    expect(shuffled.map((card) => card.id).join(",")).not.toBe(
      original.map((card) => card.id).join(","),
    );
  });

  it("creates a fresh shuffled deck for every round", () => {
    let game = makeGame(["Hugo", "Alex", "Sarah"], rng(3));
    const round1Ids = [
      ...game.drawPile.map((card) => card.id),
      ...game.players.flatMap((player) => player.hand.map((card) => card.id)),
    ].sort();
    expect(round1Ids).toHaveLength(104);

    game = {
      ...game,
      status: "ROUND_END",
      drawPile: game.drawPile.slice(0, 10),
    };
    const leftover = game.drawPile.map((card) => card.id);

    game = startNextRound(game, rng(21));
    const round2Ids = [
      ...game.drawPile.map((card) => card.id),
      ...game.players.flatMap((player) => player.hand.map((card) => card.id)),
    ].sort();

    expect(round2Ids).toHaveLength(104);
    expect(round2Ids).toEqual(createDeck().map((card) => card.id).sort());
    expect(game.drawPile.map((card) => card.id).join(",")).not.toBe(
      leftover.join(","),
    );
    expect(game.roundNumber).toBe(2);

    const round3 = startRound(
      { ...game, status: "ROUND_END", drawPile: [] },
      rng(44),
    );
    expect(round3.roundNumber).toBe(3);
    expect(
      round3.drawPile.length +
        round3.players.reduce((sum, player) => sum + player.hand.length, 0),
    ).toBe(104);
  });

  it("builds a shuffled deck with the secure helper", () => {
    const deck = createShuffledDeck(rng(5));
    expect(deck).toHaveLength(104);
  });
});
