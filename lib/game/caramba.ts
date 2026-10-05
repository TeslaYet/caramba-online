import { GAME_RULES } from "./rules";
import { calculateHandScore } from "./scoring";
import type { GameState, PlayerState, RoundResult, RoundScoreLine } from "./types";
import { getActivePlayers } from "./turn-manager";

export function canCallCaramba(state: GameState, playerId: string): boolean {
  if (state.status !== "PLAYING") {
    return false;
  }
  if (state.currentPlayerId !== playerId) {
    return false;
  }
  if (state.turnPhase !== "DISCARD") {
    return false;
  }
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.eliminated) {
    return false;
  }
  return calculateHandScore(player.hand) <= GAME_RULES.CARAMBA_MAX_HAND;
}

export function resolveCaramba(
  state: GameState,
  callerId: string,
): Omit<RoundResult, "lines"> & { caller: PlayerState; others: PlayerState[] } {
  const active = getActivePlayers(state);
  const caller = active.find((player) => player.id === callerId);
  if (!caller) {
    throw new Error("Only an active player can call Carramba.");
  }

  const callerValue = calculateHandScore(caller.hand);
  const others = active.filter((player) => player.id !== callerId);
  const lower = others.filter(
    (player) => calculateHandScore(player.hand) < callerValue,
  );
  const tied = others.filter(
    (player) => calculateHandScore(player.hand) === callerValue,
  );

  let reason: RoundResult["reason"] = "STRICT_LOWEST";
  if (tied.length > 0) {
    reason = "TIED_LOWEST";
  } else if (lower.length > 0) {
    reason = "NOT_LOWEST";
  }

  return {
    callerId,
    callerNickname: caller.nickname,
    success: reason === "STRICT_LOWEST",
    reason,
    tiedWithIds: tied.map((player) => player.id),
    lowerIds: lower.map((player) => player.id),
    caller,
    others,
  };
}

export function calculateRoundScores(state: GameState, callerId: string): RoundResult {
  const resolution = resolveCaramba(state, callerId);
  const active = getActivePlayers(state);

  const lines: RoundScoreLine[] = active.map((player) => {
    const handValue = calculateHandScore(player.hand);
    const isCaller = player.id === callerId;
    const roundScore = isCaller
      ? resolution.success
        ? 0
        : handValue + GAME_RULES.CARAMBA_PENALTY
      : handValue;

    return {
      playerId: player.id,
      nickname: player.nickname,
      hand: [...player.hand],
      handValue,
      roundScore,
      previousTotal: player.totalScore,
      appliedTotal: player.totalScore + roundScore,
      hitExactHundred: false,
      eliminatedThisRound: false,
    };
  });

  return {
    callerId: resolution.callerId,
    callerNickname: resolution.callerNickname,
    success: resolution.success,
    reason: resolution.reason,
    tiedWithIds: resolution.tiedWithIds,
    lowerIds: resolution.lowerIds,
    lines,
  };
}
