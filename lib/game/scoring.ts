import { GAME_RULES } from "./rules";
import type { Card, Rank } from "./types";

const RANK_VALUES: Record<Rank, number> = {
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

export function getCardValue(card: Pick<Card, "rank">): number {
  return RANK_VALUES[card.rank];
}

export function calculateHandScore(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + getCardValue(card), 0);
}

export function apply100PointRule(score: number): {
  score: number;
  hitExactHundred: boolean;
  eliminated: boolean;
} {
  if (score === GAME_RULES.ELIMINATION_THRESHOLD) {
    return {
      score: GAME_RULES.EXACT_THRESHOLD_RESET,
      hitExactHundred: true,
      eliminated: false,
    };
  }

  if (score > GAME_RULES.ELIMINATION_THRESHOLD) {
    return { score, hitExactHundred: false, eliminated: true };
  }

  return { score, hitExactHundred: false, eliminated: false };
}
