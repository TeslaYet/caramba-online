export const GAME_RULES = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,

  INITIAL_HAND_SIZE: 5,

  MIN_SEQUENCE_LENGTH: 3,
  MAX_SEQUENCE_LENGTH: 5,

  MIN_SAME_RANK_GROUP: 2,
  MAX_SAME_RANK_GROUP: 5,

  MIN_END_OF_TURN_HAND_SIZE: 1,

  CARAMBA_MAX_HAND: 7,
  CARAMBA_PENALTY: 30,

  ELIMINATION_THRESHOLD: 100,
  EXACT_THRESHOLD_RESET: 50,

  DECKS: 2,
  CARDS_PER_DECK: 52,
  CARD_DECK_SIZE: 104,

  DISCARD_PICKUP_MODE: "PREVIOUS_PLAYER_LATEST_DISCARD" as const,

  STARTING_PLAYER_MODE: "RANDOM" as const,

  ROOM_CODE_LENGTH: 6,
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 16,

  NEXT_ROUND_COUNTDOWN_MS: 8000,
} as const;

export const RULE_ASSUMPTIONS = [
  "A valid discard is 1 card, 2-5 cards of the same rank, or 3-5 consecutive cards of the same color.",
  "A player may discard their entire hand if that hand itself forms a valid combination.",
  "After discarding, the player draws exactly 1 card.",
  "A player may take 1 card from the immediately previous player's latest discard group instead of drawing from the deck.",
  "A completed turn must always end with at least 1 card.",
  "Ace may be low or high in sequences, but always scores 1.",
  "A new 104-card deck is created and randomly shuffled before every round.",
  "Carramba can only be called with a hand total of 7 or less.",
  "Successful Carramba = 0 round points for caller.",
  "Failed Carramba = caller hand value + 30.",
  "Other active players receive their hand value.",
  "Exactly 100 cumulative points becomes 50.",
  "More than 100 eliminates the player.",
  "The game ends when only one active player remains.",
] as const;
