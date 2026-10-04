import { createCard } from "@/lib/game/cards";
import { createInitialGame } from "@/lib/game/game-engine";
import type { Card, GameState, Rank, Suit } from "@/lib/game/types";

export function card(suit: Suit, rank: Rank, deck: 1 | 2 = 1, index = 1): Card {
  return createCard(deck, suit, rank, index);
}

export function rng(seed = 1) {
  let value = seed;
  return (maxExclusive: number) => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value % maxExclusive;
  };
}

export function makeGame(
  nicknames = ["Hugo", "Alex"],
  randomInt = rng(7),
): GameState {
  const players = nicknames.map((nickname, index) => ({
    id: `player-${index + 1}`,
    nickname,
    seatIndex: index,
    connected: true,
    ready: true,
  }));

  return createInitialGame({
    id: "game-1",
    roomId: "room-1",
    roomCode: "X7K2P9",
    hostPlayerId: players[0]!.id,
    players,
    randomInt,
  });
}

export function redSequence9ToK(): Card[] {
  return [
    card("hearts", "9", 1, 1),
    card("diamonds", "10", 1, 2),
    card("hearts", "J", 1, 3),
    card("diamonds", "Q", 1, 4),
    card("hearts", "K", 1, 5),
  ];
}
