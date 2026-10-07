import { describe, expect, it } from "vitest";
import { cueMemoryFrom, presentNewEvents } from "@/lib/game/table-cues";
import type { Card, DiscardGroup, GameLogEvent } from "@/lib/game/types";

function card(id: string): Card {
  return { id, rank: "7", suit: "hearts", color: "red" };
}

function event(
  sequenceNumber: number,
  type: GameLogEvent["type"],
  actorPlayerId: string | null,
  payload: Record<string, unknown> = {},
): GameLogEvent {
  return {
    id: `evt-${sequenceNumber}`,
    sequenceNumber,
    type,
    actorPlayerId,
    payload,
    timestamp: sequenceNumber,
  };
}

function group(id: string, playerId: string, cards: Card[]): DiscardGroup {
  return {
    id,
    playerId,
    cards,
    turnNumber: 1,
    timestamp: 1,
    pickupEligible: false,
  };
}

describe("presentNewEvents", () => {
  it("does not replay events that were already on the table", () => {
    const events = [event(1, "PLAYER_PLAYED", "a")];
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 2,
      events,
      groups: [],
      handIds: [],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 2,
      events,
      groups: [],
      hand: [],
      selfId: "a",
    });
    expect(result.cues).toEqual([]);
  });

  it("animates a discard from the new public group only", () => {
    const played = [card("c1"), card("c2")];
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 1,
      events: [],
      groups: [],
      handIds: [],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 2,
      events: [event(1, "PLAYER_PLAYED", "opponent")],
      groups: [group("g1", "opponent", played)],
      hand: [],
      selfId: "me",
    });
    expect(result.cues).toEqual([
      { id: "evt-1", kind: "discard", actorId: "opponent", cards: played },
    ]);
  });

  it("keeps an opponent draw face-down", () => {
    const secret = card("secret");
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 1,
      events: [],
      groups: [],
      handIds: [],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 2,
      events: [event(1, "PLAYER_DREW", "opponent")],
      groups: [],
      hand: [secret],
      selfId: "me",
    });
    expect(result.cues[0]).toMatchObject({
      kind: "draw",
      actorId: "opponent",
      hidden: true,
      card: null,
    });
  });

  it("shows only the card that entered my own hand", () => {
    const mine = card("mine");
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 1,
      events: [],
      groups: [],
      handIds: [],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 2,
      events: [event(1, "PLAYER_DREW", "me")],
      groups: [],
      hand: [mine],
      selfId: "me",
    });
    expect(result.cues[0]).toMatchObject({ kind: "draw", hidden: false, card: mine });
  });

  it("lifts the public card that left the discard pile", () => {
    const taken = card("taken");
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 1,
      events: [],
      groups: [group("g1", "opponent", [taken, card("stay")])],
      handIds: [],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 2,
      events: [event(1, "PLAYER_TOOK_DISCARD", "me")],
      groups: [group("g1", "opponent", [card("stay")])],
      hand: [taken],
      selfId: "me",
    });
    expect(result.cues[0]).toMatchObject({ kind: "pickup", card: taken });
  });

  it("ignores a repeated sequence number", () => {
    const memory = cueMemoryFrom({
      gameId: "g",
      version: 3,
      events: [event(4, "PLAYER_DREW", "me")],
      groups: [],
      handIds: ["mine"],
    });
    const result = presentNewEvents({
      memory,
      gameId: "g",
      version: 4,
      events: [event(4, "PLAYER_DREW", "me"), event(2, "PLAYER_PLAYED", "me")],
      groups: [],
      hand: [card("mine")],
      selfId: "me",
    });
    expect(result.cues).toEqual([]);
  });
});
