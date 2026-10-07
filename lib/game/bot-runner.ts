import { chooseBotAction, botView, type BotAction, type BotDifficulty } from "./bots";
import {
  callCaramba,
  drawFromDeck,
  playCards,
  takePreviousDiscard,
} from "./game-engine";
import { getPreviousActivePlayer } from "./turn-manager";
import type { GameState, RandomInt } from "./types";

function applyAction(state: GameState, playerId: string, action: BotAction, randomInt: RandomInt) {
  if (action.type === "PLAY_CARDS") {
    return playCards(state, playerId, action.cardIds);
  }
  if (action.type === "DRAW_FROM_DECK") {
    return drawFromDeck(state, playerId, randomInt);
  }
  if (action.type === "TAKE_FROM_PREVIOUS_DISCARD") {
    return takePreviousDiscard(state, playerId, action.cardId);
  }
  return callCaramba(state, playerId);
}

function fallback(state: GameState, playerId: string, randomInt: RandomInt): GameState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return state;
  }
  if (state.turnPhase === "DRAW") {
    return drawFromDeck(state, playerId, randomInt);
  }
  const highest = [...player.hand].sort(
    (a, b) => b.rank.localeCompare(a.rank) || b.id.localeCompare(a.id),
  )[0];
  if (!highest) {
    return state;
  }
  return playCards(state, playerId, [highest.id]);
}

export function viewForBot(state: GameState, botId: string) {
  const self = state.players.find((player) => player.id === botId);
  const previous = state.currentPlayerId
    ? getPreviousActivePlayer(state, state.currentPlayerId)
    : null;
  const group = previous
    ? [...state.discardHistory].reverse().find((entry) => entry.playerId === previous.id)
    : null;
  return botView({
    phase: state.turnPhase,
    selfHand: self?.hand ?? [],
    opponents: state.players
      .filter((player) => player.id !== botId && !player.eliminated)
      .map((player) => ({ cardCount: player.hand.length })),
    eligibleDiscard:
      state.turnPhase === "DRAW" && state.currentPlayerId === botId ? (group?.cards ?? null) : null,
  });
}

export function playBotTurns(
  state: GameState,
  randomInt: RandomInt,
  random: () => number = Math.random,
): GameState {
  let next = state;
  for (let step = 0; step < 24; step += 1) {
    if (next.status !== "PLAYING" || !next.currentPlayerId) {
      break;
    }
    const player = next.players.find((entry) => entry.id === next.currentPlayerId);
    if (!player?.isBot) {
      break;
    }
    const before = next.version;
    const difficulty: BotDifficulty = player.botDifficulty ?? "normal";
    try {
      const action = chooseBotAction(viewForBot(next, player.id), difficulty, random);
      next = applyAction(next, player.id, action, randomInt);
    } catch {
      try {
        next = fallback(next, player.id, randomInt);
      } catch {
        break;
      }
    }
    if (next.version === before) {
      break;
    }
  }
  return next;
}
