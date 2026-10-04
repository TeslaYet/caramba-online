import type { Card, CardColor, Rank, Suit } from "./types";
import { RANKS, SUITS } from "./types";

export function suitColor(suit: Suit): CardColor {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

export function createCard(
  deckIndex: 1 | 2,
  suit: Suit,
  rank: Rank,
  copyIndex: number,
): Card {
  const padded = String(copyIndex).padStart(3, "0");
  return {
    id: `deck${deckIndex}-${suit}-${rank}-${padded}`,
    rank,
    suit,
    color: suitColor(suit),
  };
}

export function cardShortLabel(card: Card): string {
  const suitLetter =
    card.suit === "hearts"
      ? "H"
      : card.suit === "diamonds"
        ? "D"
        : card.suit === "clubs"
          ? "C"
          : "S";
  return `${card.rank}${suitLetter}`;
}

export function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}

export function cardsByIds(cards: Card[], ids: string[]): Card[] {
  return ids.map((id) => {
    const card = findCard(cards, id);
    if (!card) {
      throw new Error(`Card ${id} is not in the provided collection.`);
    }
    return card;
  });
}

export function removeCards(cards: Card[], ids: string[]): Card[] {
  const idSet = new Set(ids);
  return cards.filter((card) => !idSet.has(card.id));
}

export function allRanks(): Rank[] {
  return [...RANKS];
}

export function allSuits(): Suit[] {
  return [...SUITS];
}
