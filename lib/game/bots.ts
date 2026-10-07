import { calculateHandScore, getCardValue } from "./scoring";
import type { Card, TurnPhase } from "./types";
import { validateDiscard } from "./validators";

export type BotDifficulty = "easy" | "normal" | "hard" | "expert";

export type BotAction =
  | { type: "PLAY_CARDS"; cardIds: string[] }
  | { type: "DRAW_FROM_DECK" }
  | { type: "TAKE_FROM_PREVIOUS_DISCARD"; cardId: string }
  | { type: "CALL_CARAMBA" };

export interface BotView {
  phase: TurnPhase;
  selfHand: Card[];
  opponentCardCounts: number[];
  eligibleDiscard: Card[] | null;
  handValue: number;
}

export function botView(input: {
  phase: TurnPhase;
  selfHand: Card[];
  opponents: Array<{ cardCount: number }>;
  eligibleDiscard: Card[] | null;
}): BotView {
  return {
    phase: input.phase,
    selfHand: input.selfHand.map((card) => ({ ...card })),
    opponentCardCounts: input.opponents.map((opponent) => opponent.cardCount),
    eligibleDiscard: input.eligibleDiscard?.map((card) => ({ ...card })) ?? null,
    handValue: calculateHandScore(input.selfHand),
  };
}

function combinations(cards: Card[], maxSize: number): Card[][] {
  const found: Card[][] = [];
  const current: Card[] = [];

  function walk(start: number) {
    if (current.length > 0) {
      found.push([...current]);
    }
    if (current.length === maxSize) {
      return;
    }
    for (let index = start; index < cards.length; index += 1) {
      const card = cards[index];
      if (!card) {
        continue;
      }
      current.push(card);
      walk(index + 1);
      current.pop();
    }
  }

  walk(0);
  return found;
}

function legalDiscards(hand: Card[]): Card[][] {
  return combinations(hand, Math.min(5, hand.length)).filter(
    (cards) => validateDiscard(cards).valid,
  );
}

function remainingValue(hand: Card[], discarded: Card[]): number {
  const gone = new Set(discarded.map((card) => card.id));
  return calculateHandScore(hand.filter((card) => !gone.has(card.id)));
}

function bestDiscard(hand: Card[]): Card[] {
  const options = legalDiscards(hand);
  const singles = hand.map((card) => [card]);
  const pool = options.length > 0 ? options : singles;
  return pool.reduce((best, option) => {
    const left = remainingValue(hand, option);
    const bestLeft = remainingValue(hand, best);
    if (left !== bestLeft) {
      return left < bestLeft ? option : best;
    }
    const shed = calculateHandScore(option);
    return shed > calculateHandScore(best) ? option : best;
  });
}

function weakDiscard(hand: Card[], random: () => number): Card[] {
  const high = [...hand].sort((a, b) => getCardValue(b) - getCardValue(a))[0];
  if (!high) {
    return [];
  }
  if (random() < 0.35) {
    const options = legalDiscards(hand);
    const pick = options[Math.floor(random() * options.length)];
    return pick ?? [high];
  }
  return [high];
}

function completesGroup(hand: Card[], card: Card): boolean {
  const sameRank = hand.filter((item) => item.rank === card.rank).length;
  if (sameRank >= 1) {
    return true;
  }
  const sameColor = hand.filter((item) => item.color === card.color);
  return validateDiscard([...sameColor.slice(0, 4), card]).valid && sameColor.length >= 2;
}

function wantsDiscard(view: BotView, card: Card, difficulty: BotDifficulty, random: () => number): boolean {
  const value = getCardValue(card);
  if (difficulty === "easy") {
    return value <= 2 && random() < 0.2;
  }
  if (difficulty === "normal") {
    return value <= 5 || handHasRank(view.selfHand, card);
  }
  if (completesGroup(view.selfHand, card)) {
    return true;
  }
  return difficulty === "expert" ? value <= 3 : value <= 4;
}

function handHasRank(hand: Card[], card: Card): boolean {
  return hand.some((item) => item.rank === card.rank);
}

function shouldCall(view: BotView, difficulty: BotDifficulty): boolean {
  if (view.phase !== "DISCARD" || view.handValue > 7) {
    return false;
  }
  const crowded =
    view.opponentCardCounts.length > 0 &&
    view.opponentCardCounts.every((count) => count >= 4);
  if (difficulty === "easy") {
    return view.handValue <= 2;
  }
  if (difficulty === "normal") {
    return view.handValue <= 5;
  }
  if (difficulty === "hard") {
    return view.handValue <= 4 || (view.handValue <= 7 && crowded);
  }
  const average =
    view.opponentCardCounts.reduce((sum, count) => sum + count, 0) /
    Math.max(1, view.opponentCardCounts.length);
  return view.handValue <= 5 || (view.handValue <= 7 && view.handValue < average * 3);
}

export function chooseBotAction(
  view: BotView,
  difficulty: BotDifficulty,
  random: () => number = Math.random,
): BotAction {
  if (view.phase === "DRAW") {
    const pile = view.eligibleDiscard ?? [];
    const choice = [...pile].sort((a, b) => getCardValue(a) - getCardValue(b))[0];
    if (choice && wantsDiscard(view, choice, difficulty, random)) {
      return { type: "TAKE_FROM_PREVIOUS_DISCARD", cardId: choice.id };
    }
    return { type: "DRAW_FROM_DECK" };
  }

  if (shouldCall(view, difficulty)) {
    return { type: "CALL_CARAMBA" };
  }

  const discarded =
    difficulty === "easy" ? weakDiscard(view.selfHand, random) : bestDiscard(view.selfHand);
  return { type: "PLAY_CARDS", cardIds: discarded.map((card) => card.id) };
}
