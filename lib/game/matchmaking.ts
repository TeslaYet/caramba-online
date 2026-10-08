export type QueueMode = "casual" | "ranked";

export interface QueueEntry {
  id: string;
  userId: string;
  playerId: string;
  nickname: string;
  mode: QueueMode;
  joinedAt: number;
  lastSeenAt: number;
}

export const QUEUE_STALE_MS = 20_000;
export const QUEUE_WAIT_MS = 8_000;
export const QUEUE_SOLO_MATCH_MS = 60_000;

export function pruneQueue(entries: QueueEntry[], now: number, staleMs = QUEUE_STALE_MS): QueueEntry[] {
  return entries.filter((entry) => now - entry.lastSeenAt <= staleMs);
}

export function joinQueue(
  entries: QueueEntry[],
  entry: QueueEntry,
): { entries: QueueEntry[]; duplicate: boolean } {
  if (entries.some((current) => current.userId === entry.userId)) {
    return { entries, duplicate: true };
  }
  return { entries: [...entries, entry], duplicate: false };
}

export function leaveQueue(entries: QueueEntry[], userId: string): QueueEntry[] {
  return entries.filter((entry) => entry.userId !== userId);
}

export function touchQueue(entries: QueueEntry[], userId: string, now: number): QueueEntry[] {
  return entries.map((entry) =>
    entry.userId === userId ? { ...entry, lastSeenAt: now } : entry,
  );
}

export function claimMatch(
  entries: QueueEntry[],
  mode: QueueMode,
  now: number,
): { claimed: QueueEntry[]; rest: QueueEntry[] } | null {
  const waiting = entries
    .filter((entry) => entry.mode === mode)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  if (waiting.length < 2) {
    return null;
  }
  const oldest = waiting[0];
  if (!oldest) {
    return null;
  }
  const ready = waiting.length >= 4 || now - oldest.joinedAt >= QUEUE_WAIT_MS;
  if (!ready) {
    return null;
  }
  const claimed = waiting.slice(0, Math.min(8, waiting.length));
  const ids = new Set(claimed.map((entry) => entry.userId));
  return {
    claimed,
    rest: entries.filter((entry) => !ids.has(entry.userId)),
  };
}

/** Casual only. One person who has waited a minute can be paired with a bot. */
export function claimSolo(
  entries: QueueEntry[],
  mode: QueueMode,
  now: number,
): { solo: QueueEntry; rest: QueueEntry[] } | null {
  if (mode !== "casual") {
    return null;
  }
  const waiting = entries
    .filter((entry) => entry.mode === mode)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const solo = waiting[0];
  if (waiting.length !== 1 || !solo || now - solo.joinedAt < QUEUE_SOLO_MATCH_MS) {
    return null;
  }
  return {
    solo,
    rest: entries.filter((entry) => entry.userId !== solo.userId),
  };
}
