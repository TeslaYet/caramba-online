import { cardsByIds, findCard, removeCards } from "./cards";
import { calculateRoundScores, canCallCaramba } from "./caramba";
import { createShuffledDeck, dealInitialHands, shuffleDeck } from "./deck";
import { GAME_RULES } from "./rules";
import { readScoreRules } from "./score-settings";
import { applyScoreLimit, calculateHandScore } from "./scoring";
import {
  chooseStartingPlayer,
  getActivePlayers,
  getNextActivePlayer,
  getPreviousActivePlayer,
  getWinner,
  isGameOver,
  requirePlayer,
} from "./turn-manager";
import type {
  Card,
  DiscardGroup,
  GameLogEvent,
  GameState,
  PlayerState,
  RandomInt,
} from "./types";
import { validateDiscard } from "./validators";

export class GameEngineError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_YOUR_TURN"
      | "WRONG_PHASE"
      | "INVALID_MOVE"
      | "NOT_FOUND"
      | "GAME_NOT_PLAYING"
      | "PLAYER_ELIMINATED"
      | "STALE_STATE"
      | "CARD_NOT_OWNED"
      | "NO_DRAW"
      | "NO_PICKUP",
  ) {
    super(message);
    this.name = "GameEngineError";
  }
}

function now(): number {
  return Date.now();
}

function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function appendEvent(
  state: GameState,
  type: GameLogEvent["type"],
  actorPlayerId: string | null,
  payload: Record<string, unknown>,
): GameState {
  const event: GameLogEvent = {
    id: nextId("evt"),
    sequenceNumber: state.events.length + 1,
    type,
    actorPlayerId,
    payload,
    timestamp: now(),
  };
  return { ...state, events: [...state.events, event] };
}

function replacePlayer(state: GameState, player: PlayerState): GameState {
  return {
    ...state,
    players: state.players.map((entry) => (entry.id === player.id ? player : entry)),
  };
}

export function assertGameMember(state: GameState, playerId: string): void {
  if (!state.players.some((player) => player.id === playerId)) {
    throw new GameEngineError("You are not in this game.", "NOT_FOUND");
  }
}

function assertPlaying(state: GameState): void {
  if (state.status !== "PLAYING") {
    throw new GameEngineError("The game is not in play.", "GAME_NOT_PLAYING");
  }
}

function assertCurrentPlayer(state: GameState, playerId: string): PlayerState {
  const player = requirePlayer(state, playerId);
  if (player.eliminated) {
    throw new GameEngineError("Eliminated players cannot act.", "PLAYER_ELIMINATED");
  }
  if (state.currentPlayerId !== playerId) {
    throw new GameEngineError("It is not your turn.", "NOT_YOUR_TURN");
  }
  return player;
}

export function collectAllCardIds(state: GameState): string[] {
  const ids = [
    ...state.drawPile.map((card) => card.id),
    ...state.discardHistory.flatMap((group) => group.cards.map((card) => card.id)),
    ...state.players.flatMap((player) => player.hand.map((card) => card.id)),
  ];
  return ids;
}

export function assertExclusiveCardOwnership(state: GameState): void {
  const ids = collectAllCardIds(state);
  if (new Set(ids).size !== ids.length) {
    throw new Error("A physical card exists in more than one place.");
  }
}

export function getEligibleDiscardGroup(state: GameState): DiscardGroup | null {
  if (state.turnPhase !== "DRAW" || !state.currentPlayerId) {
    return null;
  }
  const previous = getPreviousActivePlayer(state, state.currentPlayerId);
  if (!previous) {
    return null;
  }
  return (
    [...state.discardHistory]
      .reverse()
      .find((group) => group.playerId === previous.id && group.cards.length > 0) ??
    null
  );
}

export function withPickupFlags(state: GameState): GameState {
  const eligible = getEligibleDiscardGroup(state);
  return {
    ...state,
    discardHistory: state.discardHistory.map((group) => ({
      ...group,
      pickupEligible: group.id === eligible?.id,
    })),
  };
}

function rebuildDrawPileIfNeeded(
  state: GameState,
  randomInt: RandomInt,
): GameState {
  if (state.drawPile.length > 0) {
    return state;
  }

  const lastGroup = [...state.discardHistory]
    .reverse()
    .find((group) => group.cards.length > 0);
  if (!lastGroup) {
    return state;
  }

  const recycledCards = state.discardHistory
    .filter((group) => group.id !== lastGroup.id)
    .flatMap((group) => group.cards);

  if (recycledCards.length === 0) {
    return state;
  }

  return {
    ...state,
    drawPile: shuffleDeck(recycledCards, randomInt),
    discardHistory: [{ ...lastGroup, pickupEligible: false }],
  };
}

export function startRound(
  state: GameState,
  randomInt: RandomInt,
  options?: { starterId?: string; incrementRound?: boolean },
): GameState {
  const active = getActivePlayers(state);
  if (active.length < GAME_RULES.MIN_PLAYERS && state.roundNumber > 0) {
    const winner = getWinner(state);
    return {
      ...state,
      status: "GAME_OVER",
      winnerId: winner?.id ?? null,
      currentPlayerId: null,
      turnPhase: "DISCARD",
    };
  }

  const freshDeck = createShuffledDeck(randomInt);
  const { hands, drawPile } = dealInitialHands(freshDeck, active.length);
  const starter =
    (options?.starterId
      ? active.find((player) => player.id === options.starterId)
      : null) ?? chooseStartingPlayer(active, randomInt);

  let next: GameState = {
    ...state,
    status: "PLAYING",
    drawPile,
    discardHistory: [],
    lastDiscardGroupId: null,
    currentPlayerId: starter.id,
    turnPhase: "DISCARD",
    turnNumber: 1,
    roundNumber: options?.incrementRound === false ? state.roundNumber : state.roundNumber + 1,
    roundStarterId: starter.id,
    version: state.version + 1,
    winnerId: null,
    roundResult: null,
    nextRoundAt: null,
    players: state.players.map((player) => {
      if (player.eliminated) {
        return { ...player, hand: [], lastRoundScore: player.lastRoundScore };
      }
      const seatOrder = active.findIndex((entry) => entry.id === player.id);
      return {
        ...player,
        hand: hands[seatOrder] ? [...hands[seatOrder]] : [],
        lastRoundScore: null,
      };
    }),
  };

  next = appendEvent(next, "ROUND_STARTED", null, {
    roundNumber: next.roundNumber,
    starterId: starter.id,
    deckSize: GAME_RULES.CARD_DECK_SIZE,
    freshDeck: true,
  });
  next = appendEvent(next, "CARDS_DEALT", null, {
    cardsPerPlayer: GAME_RULES.INITIAL_HAND_SIZE,
    activePlayerCount: active.length,
  });
  assertExclusiveCardOwnership(next);
  return withPickupFlags(next);
}

export function createInitialGame(input: {
  id: string;
  roomId: string;
  roomCode: string;
  hostPlayerId: string;
  players: Array<
    Pick<PlayerState, "id" | "nickname" | "seatIndex" | "connected" | "ready"> & {
      isBot?: boolean;
      botDifficulty?: PlayerState["botDifficulty"];
      userId?: string | null;
    }
  >;
  randomInt: RandomInt;
  maxScore?: number;
  resetScore?: number;
  mode?: GameState["mode"];
}): GameState {
  const rules = readScoreRules({
    maxScore: input.maxScore,
    resetScore: input.resetScore,
  });
  const players: PlayerState[] = input.players.map((player) => ({
    ...player,
    hand: [],
    totalScore: 0,
    lastRoundScore: null,
    eliminated: false,
    isBot: player.isBot === true,
    botDifficulty: player.botDifficulty,
    userId: player.userId ?? null,
  }));

  const base: GameState = {
    id: input.id,
    roomId: input.roomId,
    roomCode: input.roomCode,
    status: "PLAYING",
    players,
    drawPile: [],
    discardHistory: [],
    currentPlayerId: null,
    turnPhase: "DISCARD",
    turnNumber: 0,
    roundNumber: 0,
    roundStarterId: null,
    version: 0,
    winnerId: null,
    lastDiscardGroupId: null,
    roundResult: null,
    nextRoundAt: null,
    events: [],
    chat: [],
    hostPlayerId: input.hostPlayerId,
    maxScore: rules.maxScore,
    resetScore: rules.resetScore,
    mode: input.mode ?? "private",
    ratingApplied: false,
    ratingDeltas: null,
  };

  return startRound(base, input.randomInt, { incrementRound: true });
}

export function canPlayCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
): { ok: true } | { ok: false; message: string } {
  try {
    assertPlaying(state);
    const player = assertCurrentPlayer(state, playerId);
    if (state.turnPhase !== "DISCARD") {
      return { ok: false, message: "You already discarded. Draw a card to finish your turn." };
    }
    const selected = cardsByIds(player.hand, cardIds);
    const validation = validateDiscard(selected);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "That move is not allowed.",
    };
  }
}

export function playCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
): GameState {
  assertPlaying(state);
  const player = assertCurrentPlayer(state, playerId);
  if (state.turnPhase !== "DISCARD") {
    throw new GameEngineError(
      "You already discarded. Draw a card to finish your turn.",
      "WRONG_PHASE",
    );
  }

  for (const id of cardIds) {
    if (!findCard(player.hand, id)) {
      throw new GameEngineError("You can only play cards from your hand.", "CARD_NOT_OWNED");
    }
  }

  const selected = cardsByIds(player.hand, cardIds);
  const validation = validateDiscard(selected);
  if (!validation.valid) {
    throw new GameEngineError(validation.message, "INVALID_MOVE");
  }

  const nextHand = removeCards(player.hand, cardIds);
  const group: DiscardGroup = {
    id: nextId("discard"),
    playerId,
    cards: selected,
    turnNumber: state.turnNumber,
    timestamp: now(),
    pickupEligible: false,
  };

  let next = replacePlayer(state, { ...player, hand: nextHand });
  next = {
    ...next,
    discardHistory: [...next.discardHistory, group],
    lastDiscardGroupId: group.id,
    turnPhase: "DRAW",
    version: next.version + 1,
  };
  next = appendEvent(next, "PLAYER_PLAYED", playerId, {
    discardType: validation.type,
    cardCount: selected.length,
  });
  assertExclusiveCardOwnership(next);
  return withPickupFlags(next);
}

export function canDrawFromDeck(state: GameState, playerId: string): boolean {
  if (state.status !== "PLAYING" || state.currentPlayerId !== playerId) {
    return false;
  }
  if (state.turnPhase !== "DRAW") {
    return false;
  }
  const rebuilt = rebuildDrawPileIfNeeded(state, () => 0);
  return rebuilt.drawPile.length > 0;
}

export function drawFromDeck(state: GameState, playerId: string, randomInt: RandomInt): GameState {
  assertPlaying(state);
  const player = assertCurrentPlayer(state, playerId);
  if (state.turnPhase !== "DRAW") {
    throw new GameEngineError("Discard a combination before drawing.", "WRONG_PHASE");
  }

  let next = rebuildDrawPileIfNeeded(state, randomInt);
  const card = next.drawPile[0];
  if (!card) {
    if (getEligibleDiscardGroup(next)) {
      throw new GameEngineError(
        "The draw pile is empty. Take a card from the previous discard.",
        "NO_DRAW",
      );
    }
    throw new GameEngineError("No cards are available to draw.", "NO_DRAW");
  }

  next = {
    ...next,
    drawPile: next.drawPile.slice(1),
    version: next.version + 1,
  };
  next = replacePlayer(next, { ...player, hand: [...player.hand, card] });
  next = appendEvent(next, "PLAYER_DREW", playerId, { source: "DECK" });
  return finishTurn(next, playerId);
}

export function canTakePreviousDiscard(
  state: GameState,
  playerId: string,
  cardId?: string,
): boolean {
  if (state.status !== "PLAYING" || state.currentPlayerId !== playerId) {
    return false;
  }
  if (state.turnPhase !== "DRAW") {
    return false;
  }
  if (GAME_RULES.DISCARD_PICKUP_MODE !== "PREVIOUS_PLAYER_LATEST_DISCARD") {
    return false;
  }
  const group = getEligibleDiscardGroup(state);
  if (!group) {
    return false;
  }
  return cardId ? Boolean(findCard(group.cards, cardId)) : group.cards.length > 0;
}

export function takePreviousDiscard(
  state: GameState,
  playerId: string,
  cardId: string,
): GameState {
  assertPlaying(state);
  const player = assertCurrentPlayer(state, playerId);
  if (state.turnPhase !== "DRAW") {
    throw new GameEngineError("Discard a combination before taking a card.", "WRONG_PHASE");
  }
  if (GAME_RULES.DISCARD_PICKUP_MODE !== "PREVIOUS_PLAYER_LATEST_DISCARD") {
    throw new GameEngineError("Discard pickup is not enabled.", "NO_PICKUP");
  }

  const group = getEligibleDiscardGroup(state);
  if (!group) {
    throw new GameEngineError(
      "There is no eligible card from the previous player's discard.",
      "NO_PICKUP",
    );
  }
  if (!cardId) {
    throw new GameEngineError("Choose a card from the previous discard.", "NO_PICKUP");
  }
  const card = findCard(group.cards, cardId);
  if (!card) {
    throw new GameEngineError(
      "That card is not available from the previous discard.",
      "NO_PICKUP",
    );
  }

  let next: GameState = {
    ...state,
    discardHistory: state.discardHistory.map((entry) =>
      entry.id === group.id
        ? { ...entry, cards: entry.cards.filter((item) => item.id !== cardId) }
        : entry,
    ),
    version: state.version + 1,
  };
  next = replacePlayer(next, { ...player, hand: [...player.hand, card] });
  next = appendEvent(next, "PLAYER_TOOK_DISCARD", playerId, {
    fromPlayerId: group.playerId,
    cardId: card.id,
  });
  return finishTurn(next, playerId);
}

function finishTurn(state: GameState, playerId: string): GameState {
  const player = requirePlayer(state, playerId);
  if (player.hand.length < GAME_RULES.MIN_END_OF_TURN_HAND_SIZE) {
    throw new GameEngineError(
      "A completed turn must leave at least one card in hand.",
      "INVALID_MOVE",
    );
  }

  const nextPlayer = getNextActivePlayer(state, playerId);
  const next: GameState = {
    ...state,
    currentPlayerId: nextPlayer?.id ?? null,
    turnPhase: "DISCARD",
    turnNumber: state.turnNumber + 1,
  };
  assertExclusiveCardOwnership(next);
  return withPickupFlags(next);
}

export function callCaramba(state: GameState, playerId: string): GameState {
  const caller = state.players.find((player) => player.id === playerId);
  if (
    caller &&
    state.currentPlayerId === playerId &&
    state.turnPhase === "DISCARD" &&
    !caller.eliminated &&
    calculateHandScore(caller.hand) > GAME_RULES.CARAMBA_MAX_HAND
  ) {
    throw new GameEngineError(
      `You can only call Carramba with a hand of ${GAME_RULES.CARAMBA_MAX_HAND} or less.`,
      "INVALID_MOVE",
    );
  }
  if (!canCallCaramba(state, playerId)) {
    throw new GameEngineError("You cannot call Carramba right now.", "INVALID_MOVE");
  }

  const result = calculateRoundScores(state, playerId);
  const scoreRules = readScoreRules(state);
  let next: GameState = {
    ...state,
    status: "ROUND_END",
    turnPhase: "DISCARD",
    currentPlayerId: null,
    version: state.version + 1,
    roundResult: result,
    nextRoundAt: now() + GAME_RULES.NEXT_ROUND_COUNTDOWN_MS,
    players: state.players.map((player) => {
      const line = result.lines.find((entry) => entry.playerId === player.id);
      if (!line) {
        return player;
      }
      const applied = applyScoreLimit(line.appliedTotal, scoreRules.maxScore, scoreRules.resetScore);
      return {
        ...player,
        totalScore: applied.score,
        lastRoundScore: line.roundScore,
        eliminated: player.eliminated || applied.eliminated,
      };
    }),
  };

  next.roundResult = {
    ...result,
    lines: result.lines.map((line) => {
      const player = requirePlayer(next, line.playerId);
      const applied = applyScoreLimit(line.appliedTotal, scoreRules.maxScore, scoreRules.resetScore);
      return {
        ...line,
        appliedTotal: player.totalScore,
        hitExactHundred: applied.hitExactHundred,
        eliminatedThisRound: applied.eliminated,
      };
    }),
  };

  next = appendEvent(next, "CARAMBA_CALLED", playerId, {
    success: result.success,
    reason: result.reason,
  });
  next = appendEvent(next, "ROUND_SCORED", playerId, {
    roundNumber: state.roundNumber,
  });

  for (const line of next.roundResult?.lines ?? []) {
    if (line.eliminatedThisRound) {
      next = appendEvent(next, "PLAYER_ELIMINATED", line.playerId, {
        score: line.appliedTotal,
      });
    }
  }

  if (isGameOver(next)) {
    const winner = getWinner(next);
    next = {
      ...next,
      status: "GAME_OVER",
      winnerId: winner?.id ?? null,
      nextRoundAt: null,
    };
    next = appendEvent(next, "GAME_FINISHED", winner?.id ?? null, {
      winnerId: winner?.id ?? null,
    });
  }

  return withPickupFlags(next);
}

export function startNextRound(state: GameState, randomInt: RandomInt): GameState {
  if (state.status === "GAME_OVER") {
    throw new GameEngineError("The match is already over.", "GAME_NOT_PLAYING");
  }
  if (state.status !== "ROUND_END") {
    throw new GameEngineError("The current round is still in progress.", "WRONG_PHASE");
  }
  if (isGameOver(state)) {
    const winner = getWinner(state);
    return {
      ...state,
      status: "GAME_OVER",
      winnerId: winner?.id ?? null,
      nextRoundAt: null,
      version: state.version + 1,
    };
  }

  return startRound(
    {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        hand: [],
      })),
      drawPile: [],
      discardHistory: [],
    },
    randomInt,
  );
}

export function rematch(state: GameState, randomInt: RandomInt): GameState {
  const resetPlayers = state.players.map((player) => ({
    ...player,
    hand: [],
    totalScore: 0,
    lastRoundScore: null,
    eliminated: false,
  }));

  return createInitialGame({
    id: nextId("game"),
    roomId: state.roomId,
    roomCode: state.roomCode,
    hostPlayerId: state.hostPlayerId,
    players: resetPlayers,
    randomInt,
    maxScore: state.maxScore,
    resetScore: state.resetScore,
    mode: state.mode,
  });
}

export function addChatMessage(
  state: GameState,
  playerId: string,
  text: string,
): GameState {
  const player = requirePlayer(state, playerId);
  const trimmed = text
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .slice(0, 240);
  if (!trimmed) {
    throw new GameEngineError("Message cannot be empty.", "INVALID_MOVE");
  }
  return {
    ...state,
    version: state.version + 1,
    chat: [
      ...state.chat,
      {
        id: nextId("chat"),
        playerId,
        nickname: player.nickname,
        text: trimmed,
        timestamp: now(),
      },
    ].slice(-80),
  };
}

export function setPlayerConnected(
  state: GameState,
  playerId: string,
  connected: boolean,
): GameState {
  const existing = state.players.find((entry) => entry.id === playerId);
  if (!existing) {
    return state;
  }
  if (existing.connected === connected) {
    return state;
  }
  return replacePlayer(state, { ...existing, connected });
}

export function arrangeTestHands(
  state: GameState,
  hands: Record<string, Card[]>,
  drawPile?: Card[],
): GameState {
  const used = new Set<string>();
  const players = state.players.map((player) => {
    const nextHand = hands[player.id] ?? player.hand;
    for (const card of nextHand) {
      used.add(card.id);
    }
    return { ...player, hand: nextHand };
  });
  const remaining =
    drawPile ??
    state.drawPile.filter((card) => !used.has(card.id)).concat(
      state.players
        .flatMap((player) => player.hand)
        .filter((card) => !used.has(card.id)),
    );

  const next: GameState = {
    ...state,
    players,
    drawPile: remaining.filter((card) => !used.has(card.id)),
    version: state.version + 1,
  };
  assertExclusiveCardOwnership(next);
  return next;
}
