export type ShowdownPhase = "announce" | "reveal" | "hold" | "result";

export const SHOWDOWN_BEATS = {
  full: { reveal: 1100, hold: 2500, result: 4200 },
  reduced: { reveal: 280, hold: 280, result: 720 },
} as const;

export function showdownPhase(elapsedMs: number, reduceMotion: boolean): ShowdownPhase {
  const beats = reduceMotion ? SHOWDOWN_BEATS.reduced : SHOWDOWN_BEATS.full;
  if (elapsedMs < beats.reveal) {
    return "announce";
  }
  if (elapsedMs < beats.hold) {
    return "reveal";
  }
  if (elapsedMs < beats.result) {
    return "hold";
  }
  return "result";
}

export function showdownFacesVisible(phase: ShowdownPhase | null) {
  return phase === "reveal" || phase === "hold" || phase === "result";
}
