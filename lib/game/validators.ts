import { GAME_RULES } from "./rules";
import type { Card, DiscardValidation, Rank } from "./types";
import { RANKS } from "./types";

const ACE_LOW_ORDER: Rank[] = [...RANKS];
const ACE_HIGH_ORDER: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const INVALID_MESSAGES: Record<DiscardValidation["reason"] & string, string> = {
  EMPTY_SELECTION: "Select at least one card.",
  TOO_MANY_CARDS: "You can discard at most 5 cards at a time.",
  DUPLICATE_CARD: "The same physical card cannot be selected twice.",
  MIXED_RANKS: "Same-rank groups must all share one rank.",
  SAME_RANK_TOO_SMALL: "A same-rank group needs at least 2 cards.",
  SAME_RANK_TOO_LARGE: "A same-rank group cannot contain more than 5 cards.",
  SEQUENCE_TOO_SHORT: "A sequence needs at least 3 cards.",
  SEQUENCE_TOO_LONG: "A sequence cannot contain more than 5 cards.",
  SEQUENCE_MUST_HAVE_SAME_COLOR: "A sequence must be all red or all black.",
  SEQUENCE_DUPLICATE_RANK: "A sequence cannot contain duplicate ranks.",
  SEQUENCE_NOT_CONSECUTIVE: "Those ranks are not a consecutive sequence.",
  SEQUENCE_CANNOT_WRAP: "Sequences cannot wrap around from King to Ace to 2.",
  NOT_A_VALID_COMBINATION:
    "Select a single card, 2–5 of the same rank, or a 3–5 card same-color sequence.",
};

function invalid(
  reason: Exclude<DiscardValidation["reason"], null>,
): DiscardValidation {
  return {
    valid: false,
    type: "INVALID",
    reason,
    message: INVALID_MESSAGES[reason],
  };
}

export function validateSameRankGroup(cards: Card[]): DiscardValidation {
  if (cards.length < GAME_RULES.MIN_SAME_RANK_GROUP) {
    return invalid("SAME_RANK_TOO_SMALL");
  }
  if (cards.length > GAME_RULES.MAX_SAME_RANK_GROUP) {
    return invalid("SAME_RANK_TOO_LARGE");
  }
  const rank = cards[0]?.rank;
  if (!rank || cards.some((card) => card.rank !== rank)) {
    return invalid("MIXED_RANKS");
  }
  return { valid: true, type: "SAME_RANK", reason: null };
}

function isContiguousSlice(ranks: Rank[], order: Rank[]): boolean {
  const indexes = ranks.map((rank) => order.indexOf(rank));
  if (indexes.some((index) => index < 0)) {
    return false;
  }
  const sorted = [...indexes].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

function looksLikeWrap(ranks: Rank[]): boolean {
  const unique = new Set(ranks);
  return unique.has("A") && unique.has("K") && unique.has("2");
}

export function validateSequence(cards: Card[]): DiscardValidation {
  if (cards.length < GAME_RULES.MIN_SEQUENCE_LENGTH) {
    return invalid("SEQUENCE_TOO_SHORT");
  }
  if (cards.length > GAME_RULES.MAX_SEQUENCE_LENGTH) {
    return invalid("SEQUENCE_TOO_LONG");
  }

  const color = cards[0]?.color;
  if (!color || cards.some((card) => card.color !== color)) {
    return invalid("SEQUENCE_MUST_HAVE_SAME_COLOR");
  }

  const ranks = cards.map((card) => card.rank);
  if (new Set(ranks).size !== ranks.length) {
    return invalid("SEQUENCE_DUPLICATE_RANK");
  }

  if (looksLikeWrap(ranks)) {
    return invalid("SEQUENCE_CANNOT_WRAP");
  }

  const consecutive =
    isContiguousSlice(ranks, ACE_LOW_ORDER) ||
    (ranks.includes("A") && isContiguousSlice(ranks, ACE_HIGH_ORDER));

  if (!consecutive) {
    return invalid("SEQUENCE_NOT_CONSECUTIVE");
  }

  return { valid: true, type: "SEQUENCE", reason: null };
}

export function validateDiscard(cards: Card[]): DiscardValidation {
  if (cards.length === 0) {
    return invalid("EMPTY_SELECTION");
  }

  const uniqueIds = new Set(cards.map((card) => card.id));
  if (uniqueIds.size !== cards.length) {
    return invalid("DUPLICATE_CARD");
  }

  if (cards.length > GAME_RULES.MAX_SEQUENCE_LENGTH) {
    return invalid("TOO_MANY_CARDS");
  }

  if (cards.length === 1) {
    return { valid: true, type: "SINGLE", reason: null };
  }

  const sameRank = validateSameRankGroup(cards);
  if (sameRank.valid) {
    return sameRank;
  }

  const sequence = validateSequence(cards);
  if (sequence.valid) {
    return sequence;
  }

  if (cards.length >= GAME_RULES.MIN_SEQUENCE_LENGTH) {
    return sequence;
  }

  if (sameRank.reason === "MIXED_RANKS") {
    return invalid("NOT_A_VALID_COMBINATION");
  }

  return sameRank;
}

export function describeDiscard(validation: DiscardValidation): string {
  if (!validation.valid) {
    return validation.message;
  }

  if (validation.type === "SINGLE") {
    return "Valid single card";
  }
  if (validation.type === "SAME_RANK") {
    return "Valid same-rank group";
  }
  return "Valid sequence";
}
