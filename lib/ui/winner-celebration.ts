export type WinnerPhase = "logo" | "name" | "podium" | "settled";

export const WINNER_BEATS = {
  full: { name: 1100, podium: 2100, settled: 3400 },
  reduced: { name: 0, podium: 0, settled: 0 },
} as const;

export function winnerPhase(elapsedMs: number, reduceMotion: boolean): WinnerPhase {
  if (reduceMotion) {
    return "settled";
  }
  const beats = WINNER_BEATS.full;
  if (elapsedMs < beats.name) {
    return "logo";
  }
  if (elapsedMs < beats.podium) {
    return "name";
  }
  if (elapsedMs < beats.settled) {
    return "podium";
  }
  return "settled";
}
