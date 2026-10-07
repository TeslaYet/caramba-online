export type SeatSide = "top" | "right" | "bottom" | "left";

export function hiddenPlaceholders(playerId: string, count: number) {
  const safe = Math.max(0, Math.floor(count));
  return Array.from({ length: safe }, (_, index) => ({
    id: `${playerId}-hidden-${index}`,
  }));
}

export function seatSide(angle: number): SeatSide {
  const rad = ((angle - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  if (Math.abs(cos) >= Math.abs(sin)) {
    return cos >= 0 ? "right" : "left";
  }
  return sin >= 0 ? "bottom" : "top";
}

export function fanStep(count: number, cardSize: number, maxSpan: number) {
  if (count <= 1) {
    return 0;
  }
  const room = Math.max(cardSize, maxSpan) - cardSize;
  const step = room / (count - 1);
  return Math.max(5, Math.min(cardSize * 0.62, step));
}

export function fanSpan(count: number, cardSize: number, step: number) {
  if (count <= 0) {
    return 0;
  }
  return cardSize + Math.max(0, count - 1) * step;
}
