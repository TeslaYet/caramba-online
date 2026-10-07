import type { Card, DiscardGroup, GameLogEvent } from "./types";

export type TableCue =
  | { id: string; kind: "deal" }
  | { id: string; kind: "discard"; actorId: string; cards: Card[] }
  | { id: string; kind: "draw"; actorId: string; hidden: boolean; card: Card | null }
  | { id: string; kind: "pickup"; actorId: string; card: Card | null }
  | { id: string; kind: "caramba"; actorId: string; success: boolean }
  | { id: string; kind: "eliminated"; actorId: string }
  | { id: string; kind: "finished"; actorId: string | null };

export interface CueMemory {
  gameId: string;
  version: number;
  sequence: number;
  groups: DiscardGroup[];
  handIds: string[];
}

export function cueMemoryFrom(input: {
  gameId: string;
  version: number;
  events: GameLogEvent[];
  groups: DiscardGroup[];
  handIds: string[];
}): CueMemory {
  return {
    gameId: input.gameId,
    version: input.version,
    sequence: input.events.at(-1)?.sequenceNumber ?? 0,
    groups: input.groups,
    handIds: input.handIds,
  };
}

export function presentNewEvents(input: {
  memory: CueMemory;
  gameId: string;
  version: number;
  events: GameLogEvent[];
  groups: DiscardGroup[];
  hand: Card[];
  selfId: string | null;
}): { memory: CueMemory; cues: TableCue[] } {
  const maxSequence = input.events.at(-1)?.sequenceNumber ?? 0;
  const freshGame = input.memory.gameId !== input.gameId || maxSequence < input.memory.sequence;
  if (freshGame || input.memory.version === input.version) {
    return {
      memory: cueMemoryFrom({ ...input, handIds: input.hand.map((card) => card.id) }),
      cues: [],
    };
  }

  const previousIds = new Set(input.memory.groups.map((group) => group.id));
  const cues: TableCue[] = [];

  for (const event of input.events) {
    if (event.sequenceNumber <= input.memory.sequence) {
      continue;
    }
    const actorId = event.actorPlayerId;
    if (event.type === "CARDS_DEALT") {
      cues.push({ id: event.id, kind: "deal" });
    }
    if (event.type === "PLAYER_PLAYED" && actorId) {
      const group = [...input.groups]
        .reverse()
        .find((entry) => entry.playerId === actorId && !previousIds.has(entry.id));
      cues.push({
        id: event.id,
        kind: "discard",
        actorId,
        cards: group?.cards ?? [],
      });
    }
    if (event.type === "PLAYER_DREW" && actorId) {
      const mine = actorId === input.selfId;
      const card = mine
        ? (input.hand.find((entry) => !input.memory.handIds.includes(entry.id)) ?? null)
        : null;
      cues.push({
        id: event.id,
        kind: "draw",
        actorId,
        hidden: !mine,
        card,
      });
    }
    if (event.type === "PLAYER_TOOK_DISCARD" && actorId) {
      const nextIds = new Set(input.groups.flatMap((group) => group.cards.map((card) => card.id)));
      const removed =
        input.memory.groups
          .flatMap((group) => group.cards)
          .find((card) => !nextIds.has(card.id)) ?? null;
      cues.push({ id: event.id, kind: "pickup", actorId, card: removed });
    }
    if (event.type === "CARAMBA_CALLED" && actorId) {
      cues.push({
        id: event.id,
        kind: "caramba",
        actorId,
        success: event.payload.success === true,
      });
    }
    if (event.type === "PLAYER_ELIMINATED" && actorId) {
      cues.push({ id: event.id, kind: "eliminated", actorId });
    }
    if (event.type === "GAME_FINISHED") {
      cues.push({ id: event.id, kind: "finished", actorId });
    }
  }

  return {
    memory: cueMemoryFrom({ ...input, handIds: input.hand.map((card) => card.id) }),
    cues,
  };
}
