export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "A",
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
] as const;
export type Rank = (typeof RANKS)[number];

export const COLORS = ["red", "black"] as const;
export type CardColor = (typeof COLORS)[number];

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  color: CardColor;
}

export type GameMode = "private" | "casual" | "ranked" | "practice";
export type BotDifficulty = "easy" | "normal" | "hard" | "expert";
export type GameStatus = "LOBBY" | "PLAYING" | "ROUND_END" | "GAME_OVER";
export type RoomStatus = "LOBBY" | "PLAYING" | "CLOSED";
export type TurnPhase = "DISCARD" | "DRAW";
export type DiscardType = "SINGLE" | "SAME_RANK" | "SEQUENCE";
export type InvalidReason =
  | "EMPTY_SELECTION"
  | "TOO_MANY_CARDS"
  | "DUPLICATE_CARD"
  | "MIXED_RANKS"
  | "SAME_RANK_TOO_SMALL"
  | "SAME_RANK_TOO_LARGE"
  | "SEQUENCE_TOO_SHORT"
  | "SEQUENCE_TOO_LONG"
  | "SEQUENCE_MUST_HAVE_SAME_COLOR"
  | "SEQUENCE_DUPLICATE_RANK"
  | "SEQUENCE_NOT_CONSECUTIVE"
  | "SEQUENCE_CANNOT_WRAP"
  | "NOT_A_VALID_COMBINATION";

export type DiscardValidation =
  | { valid: true; type: DiscardType; reason: null }
  | { valid: false; type: "INVALID"; reason: InvalidReason; message: string };

export interface PlayerState {
  id: string;
  nickname: string;
  seatIndex: number;
  hand: Card[];
  totalScore: number;
  lastRoundScore: number | null;
  eliminated: boolean;
  connected: boolean;
  ready: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  userId?: string | null;
}

export interface PublicRatingDelta {
  playerId: string;
  before: number;
  after: number;
  delta: number;
}

export interface DiscardGroup {
  id: string;
  playerId: string;
  cards: Card[];
  turnNumber: number;
  timestamp: number;
  pickupEligible: boolean;
}

export interface RoundScoreLine {
  playerId: string;
  nickname: string;
  hand: Card[];
  handValue: number;
  roundScore: number;
  previousTotal: number;
  appliedTotal: number;
  hitExactHundred: boolean;
  eliminatedThisRound: boolean;
}

export interface RoundResult {
  callerId: string;
  callerNickname: string;
  success: boolean;
  reason: "STRICT_LOWEST" | "TIED_LOWEST" | "NOT_LOWEST";
  tiedWithIds: string[];
  lowerIds: string[];
  lines: RoundScoreLine[];
}

export type GameEventType =
  | "ROUND_STARTED"
  | "CARDS_DEALT"
  | "PLAYER_PLAYED"
  | "PLAYER_DREW"
  | "PLAYER_TOOK_DISCARD"
  | "TURN_STARTED"
  | "CARAMBA_CALLED"
  | "ROUND_SCORED"
  | "PLAYER_ELIMINATED"
  | "GAME_FINISHED";

export interface GameLogEvent {
  id: string;
  sequenceNumber: number;
  type: GameEventType;
  actorPlayerId: string | null;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  id: string;
  roomId: string;
  roomCode: string;
  status: GameStatus;
  players: PlayerState[];
  drawPile: Card[];
  discardHistory: DiscardGroup[];
  currentPlayerId: string | null;
  turnPhase: TurnPhase;
  turnNumber: number;
  roundNumber: number;
  roundStarterId: string | null;
  version: number;
  winnerId: string | null;
  lastDiscardGroupId: string | null;
  roundResult: RoundResult | null;
  nextRoundAt: number | null;
  events: GameLogEvent[];
  chat: ChatMessage[];
  hostPlayerId: string;
  maxScore: number;
  resetScore: number;
  mode: GameMode;
  ratingApplied: boolean;
  ratingDeltas: PublicRatingDelta[] | null;
}

export interface PublicPlayerView {
  id: string;
  nickname: string;
  seatIndex: number;
  cardCount: number;
  score: number;
  lastRoundScore: number | null;
  eliminated: boolean;
  connected: boolean;
  ready: boolean;
  isHost: boolean;
  isCurrent: boolean;
  hand: Card[] | null;
}

export interface PublicGameState {
  id: string;
  roomId: string;
  roomCode: string;
  status: GameStatus;
  currentPlayerId: string | null;
  turnPhase: TurnPhase;
  turnNumber: number;
  roundNumber: number;
  roundStarterId: string | null;
  version: number;
  winnerId: string | null;
  drawPileCount: number;
  discardGroups: DiscardGroup[];
  eligibleDiscardGroupId: string | null;
  players: PublicPlayerView[];
  me: {
    id: string;
    hand: Card[];
    score: number;
    handValue: number;
    eliminated: boolean;
    isHost: boolean;
    isCurrent: boolean;
  } | null;
  roundResult: RoundResult | null;
  nextRoundAt: number | null;
  events: GameLogEvent[];
  chat: ChatMessage[];
  hostPlayerId: string;
  maxScore: number;
  resetScore: number;
  mode: GameMode;
  ratingDeltas: PublicRatingDelta[] | null;
}

export interface RoomRecord {
  id: string;
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  maxPlayers: number;
  maxScore: number;
  resetScore: number;
  mode: GameMode;
  gameId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type RandomInt = (maxExclusive: number) => number;
