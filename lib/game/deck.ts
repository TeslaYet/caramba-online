import { randomInt } from "node:crypto";
import { createCard } from "./cards";
import { GAME_RULES } from "./rules";
import type { Card, RandomInt } from "./types";
import { RANKS, SUITS } from "./types";

export function createDeck(): Card[] {
  const cards: Card[] = [];
  let copyIndex = 1;

  for (const deckIndex of [1, 2] as const) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push(createCard(deckIndex, suit, rank, copyIndex));
        copyIndex += 1;
      }
    }
  }

  return cards;
}

export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be greater than 0");
  }
  return randomInt(maxExclusive);
}

export function shuffleDeck(
  deck: Card[],
  randomIntFn: RandomInt = secureRandomInt,
): Card[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = randomIntFn(i + 1);
    const current = cards[i];
    const swap = cards[j];
    if (!current || !swap) {
      throw new Error("Shuffle encountered an empty slot.");
    }
    cards[i] = swap;
    cards[j] = current;
  }
  return cards;
}

export function createShuffledDeck(
  randomIntFn: RandomInt = secureRandomInt,
): Card[] {
  return shuffleDeck(createDeck(), randomIntFn);
}

export function dealInitialHands(
  deck: Card[],
  playerCount: number,
  handSize = GAME_RULES.INITIAL_HAND_SIZE,
): { hands: Card[][]; drawPile: Card[] } {
  if (playerCount * handSize > deck.length) {
    throw new Error("Not enough cards to deal the requested hands.");
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const remaining = [...deck];

  for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
      const card = remaining.shift();
      if (!card) {
        throw new Error("Deck ran out while dealing.");
      }
      hands[playerIndex]?.push(card);
    }
  }

  return { hands, drawPile: remaining };
}

export function collectPhysicalCardIds(cards: Card[]): string[] {
  return cards.map((card) => card.id).sort();
}
