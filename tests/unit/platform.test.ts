import { describe, expect, it } from "vitest";
import { rateMatch, shouldAdjustRating, STARTING_RATING } from "@/lib/game/rating";
import { canShowAds } from "@/lib/ui/entitlements";
import { rankTitle, winRate } from "@/lib/ui/ranks";
import { unreadCount } from "@/lib/ui/chat-notice";
import { canPlayAudio } from "@/lib/ui/audio";
import { claimMatch, joinQueue, leaveQueue, type QueueEntry } from "@/lib/game/matchmaking";

function entry(userId: string, at: number, mode: QueueEntry["mode"] = "casual"): QueueEntry {
  return {
    id: userId,
    userId,
    playerId: `player-${userId}`,
    nickname: userId,
    mode,
    joinedAt: at,
    lastSeenAt: at,
  };
}

describe("accounts and entitlements", () => {
  it("shows ads for free players and hides them for ad-free and premium", () => {
    expect(canShowAds("FREE")).toBe(true);
    expect(canShowAds(null)).toBe(true);
    expect(canShowAds("AD_FREE")).toBe(false);
    expect(canShowAds("PREMIUM")).toBe(false);
  });

  it("names ranks and win rate from server stats", () => {
    expect(rankTitle(STARTING_RATING)).toBe("Silver");
    expect(rankTitle(1427)).toBe("Gold");
    expect(winRate(51, 87)).toBe(58.6);
  });
});

describe("matchmaking queue", () => {
  it("rejects a second queue slot for the same player", () => {
    const first = joinQueue([], entry("a", 0));
    const second = joinQueue(first.entries, entry("a", 10));
    expect(second.duplicate).toBe(true);
    expect(second.entries).toHaveLength(1);
  });

  it("leaves the queue and forms a match after the wait", () => {
    const queued = [entry("a", 0), entry("b", 1000)];
    expect(claimMatch(queued, "casual", 2000)).toBeNull();
    const claimed = claimMatch(queued, "casual", 9000);
    expect(claimed?.claimed.map((item) => item.userId)).toEqual(["a", "b"]);
    expect(leaveQueue(queued, "a")).toHaveLength(1);
  });

  it("does not mix casual and ranked players", () => {
    const queued = [entry("a", 0, "casual"), entry("b", 0, "ranked")];
    expect(claimMatch(queued, "ranked", 20_000)).toBeNull();
  });
});

describe("ranked rating", () => {
  it("raises the winner and lowers the last place in a multiplayer game", () => {
    const changes = rateMatch([
      { id: "a", rating: 1200, place: 1 },
      { id: "b", rating: 1200, place: 2 },
      { id: "c", rating: 1200, place: 3 },
    ]);
    const winner = changes.find((change) => change.id === "a");
    const last = changes.find((change) => change.id === "c");
    expect(winner && winner.delta).toBeGreaterThan(0);
    expect(last && last.delta).toBeLessThan(0);
    expect(winner?.after).toBe((winner?.before ?? 0) + (winner?.delta ?? 0));
  });

  it("leaves rating untouched outside ranked games", () => {
    expect(shouldAdjustRating("ranked")).toBe(true);
    expect(shouldAdjustRating("casual")).toBe(false);
    expect(shouldAdjustRating("private")).toBe(false);
    expect(shouldAdjustRating("practice")).toBe(false);
  });
});

describe("chat notices and audio", () => {
  it("counts other players' unread messages and ignores your own", () => {
    const messages = [
      { playerId: "me", timestamp: 1 },
      { playerId: "alex", timestamp: 2 },
      { playerId: "alex", timestamp: 3 },
    ];
    expect(unreadCount(messages, "me", 1)).toBe(2);
    expect(unreadCount(messages, "me", 3)).toBe(0);
  });

  it("stays silent until sound is enabled and the browser has been unlocked", () => {
    expect(canPlayAudio(false, true)).toBe(false);
    expect(canPlayAudio(true, false)).toBe(false);
    expect(canPlayAudio(true, true)).toBe(true);
  });
});
