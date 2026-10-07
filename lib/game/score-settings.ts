import { GAME_RULES } from "./rules";

export const SCORE_PRESETS = [50, 75, 100, 150, 200] as const;

export function parseScoreSettings(
  maxScore: number,
  resetScore: number,
): { maxScore: number; resetScore: number } {
  if (!Number.isInteger(maxScore) || maxScore < 20 || maxScore > 500) {
    throw new Error("Maximum score must be a whole number from 20 to 500.");
  }
  if (!Number.isInteger(resetScore) || resetScore < 1 || resetScore >= maxScore) {
    throw new Error("Reset score must be greater than 0 and lower than the maximum score.");
  }
  return { maxScore, resetScore };
}

export function defaultScoreSettings() {
  return {
    maxScore: GAME_RULES.ELIMINATION_THRESHOLD,
    resetScore: GAME_RULES.EXACT_THRESHOLD_RESET,
  };
}

export function readScoreRules(state: { maxScore?: number; resetScore?: number }) {
  const fallback = defaultScoreSettings();
  const maxScore = state.maxScore ?? fallback.maxScore;
  const resetScore = state.resetScore ?? fallback.resetScore;
  if (resetScore <= 0 || resetScore >= maxScore) {
    return fallback;
  }
  return { maxScore, resetScore };
}
