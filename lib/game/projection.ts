import { getEligibleDiscardGroup } from "./game-engine";
import { readScoreRules } from "./score-settings";
import { calculateHandScore } from "./scoring";
import type { GameState, PublicGameState, PublicPlayerView } from "./types";

function eligibleDiscardGroupId(state: GameState): string | null {
  if (state.status !== "PLAYING") {
    return null;
  }
  return getEligibleDiscardGroup(state)?.id ?? null;
}

export function getPublicGameStateForPlayer(
  gameState: GameState,
  playerId: string | null,
): PublicGameState {
  const revealHands =
    gameState.status === "ROUND_END" || gameState.status === "GAME_OVER";
  const eligibleId = eligibleDiscardGroupId(gameState);

  const players: PublicPlayerView[] = gameState.players.map((player) => {
    const isMe = player.id === playerId;
    return {
      id: player.id,
      nickname: player.nickname,
      seatIndex: player.seatIndex,
      cardCount: player.hand.length,
      score: player.totalScore,
      lastRoundScore: player.lastRoundScore,
      eliminated: player.eliminated,
      connected: player.connected,
      ready: player.ready,
      isHost: player.id === gameState.hostPlayerId,
      isCurrent: player.id === gameState.currentPlayerId,
      hand: isMe || revealHands ? [...player.hand] : null,
    };
  });

  const me = gameState.players.find((player) => player.id === playerId) ?? null;

  return {
    id: gameState.id,
    roomId: gameState.roomId,
    roomCode: gameState.roomCode,
    status: gameState.status,
    currentPlayerId: gameState.currentPlayerId,
    turnPhase: gameState.turnPhase,
    turnNumber: gameState.turnNumber,
    roundNumber: gameState.roundNumber,
    roundStarterId: gameState.roundStarterId,
    version: gameState.version,
    winnerId: gameState.winnerId,
    drawPileCount: gameState.drawPile.length,
    discardGroups: gameState.discardHistory.map((group) => ({
      ...group,
      cards: [...group.cards],
      pickupEligible: group.id === eligibleId,
    })),
    eligibleDiscardGroupId: eligibleId,
    players,
    me: me
      ? {
          id: me.id,
          hand: [...me.hand],
          score: me.totalScore,
          handValue: calculateHandScore(me.hand),
          eliminated: me.eliminated,
          isHost: me.id === gameState.hostPlayerId,
          isCurrent: me.id === gameState.currentPlayerId,
        }
      : null,
    roundResult: revealHands ? gameState.roundResult : null,
    nextRoundAt: gameState.nextRoundAt,
    events: gameState.events.map((event) => ({
      ...event,
      payload: sanitizeEventPayload(event.type, event.payload),
    })),
    chat: gameState.chat,
    hostPlayerId: gameState.hostPlayerId,
    maxScore: readScoreRules(gameState).maxScore,
    resetScore: readScoreRules(gameState).resetScore,
    mode: gameState.mode ?? "private",
    ratingDeltas: gameState.status === "GAME_OVER" ? (gameState.ratingDeltas ?? null) : null,
  };
}

export function sanitizeEventPayload(
  type: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const clone = { ...payload };
  delete clone.hand;
  delete clone.hands;
  delete clone.drawPile;
  if (type === "PLAYER_DREW") {
    delete clone.card;
    delete clone.cardId;
    delete clone.cards;
    delete clone.rank;
    delete clone.suit;
    delete clone.color;
  }
  return clone;
}
