import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldApplySnapshot } from "@/lib/realtime/snapshot-order";
import { openPresence, resetPresenceForTests, shouldUpdatePresence } from "@/lib/server/presence";

afterEach(() => {
  vi.useRealTimers();
  resetPresenceForTests();
});

describe("snapshot ordering", () => {
  const room = { updatedAt: 10 };

  it("keeps a newer game version ahead of a late snapshot", () => {
    const current = { room, game: { version: 4 } };
    expect(shouldApplySnapshot(current, { room: { updatedAt: 50 }, game: { version: 3 } })).toBe(false);
    expect(shouldApplySnapshot(current, { room: { updatedAt: 11 }, game: { version: 4 } })).toBe(true);
    expect(shouldApplySnapshot(current, { room: { updatedAt: 12 }, game: { version: 5 } })).toBe(true);
  });

  it("accepts the first snapshot and a newer lobby update", () => {
    expect(shouldApplySnapshot(null, { room, game: null })).toBe(true);
    expect(
      shouldApplySnapshot(
        { room, game: { version: 2 } },
        { room: { updatedAt: 9 }, game: null },
      ),
    ).toBe(false);
    expect(
      shouldApplySnapshot(
        { room, game: { version: 2 } },
        { room: { updatedAt: 20 }, game: null },
      ),
    ).toBe(true);
  });
});

describe("presence", () => {
  it("ignores a stale disconnect after a newer connection write", () => {
    expect(shouldUpdatePresence({ connected: true, updatedAt: 200 }, false, 100)).toBe(false);
    expect(shouldUpdatePresence({ connected: true, updatedAt: 50 }, false, 100)).toBe(true);
    expect(shouldUpdatePresence({ connected: false, updatedAt: 50 }, false, 100)).toBe(false);
  });

  it("waits out a short stream restart before marking the player disconnected", () => {
    vi.useFakeTimers();
    const calls: boolean[] = [];
    const release = openPresence("ABCD12", "player-1", (connected) => {
      calls.push(connected);
    });
    expect(calls).toEqual([true]);
    release();
    const releaseAgain = openPresence("abcd12", "player-1", (connected) => {
      calls.push(connected);
    });
    vi.advanceTimersByTime(5000);
    expect(calls).toEqual([true, true]);
    releaseAgain();
    vi.advanceTimersByTime(4999);
    expect(calls).toEqual([true, true]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual([true, true, false]);
  });
});
