export const STARTING_RATING = 1200;
const K_FACTOR = 24;
const MIN_RATING = 100;
const MAX_RATING = 3000;

export interface RatedPlayer {
  id: string;
  rating: number;
  place: number;
}

export interface RatingChange {
  id: string;
  before: number;
  after: number;
  delta: number;
}

export function expectedPair(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/**
 * Multiplayer rating. Each player is compared with every other player.
 * The K factor is shared across opponents so a larger table does not
 * multiply the swing by the player count.
 */
export function rateMatch(players: RatedPlayer[]): RatingChange[] {
  if (players.length < 2) {
    return players.map((player) => ({
      id: player.id,
      before: player.rating,
      after: player.rating,
      delta: 0,
    }));
  }

  const scale = K_FACTOR / (players.length - 1);
  return players.map((player) => {
    let actual = 0;
    let expected = 0;
    for (const opponent of players) {
      if (opponent.id === player.id) {
        continue;
      }
      if (player.place < opponent.place) {
        actual += 1;
      } else if (player.place === opponent.place) {
        actual += 0.5;
      }
      expected += expectedPair(player.rating, opponent.rating);
    }
    const delta = Math.round(scale * (actual - expected));
    const after = Math.min(MAX_RATING, Math.max(MIN_RATING, player.rating + delta));
    return {
      id: player.id,
      before: player.rating,
      after,
      delta: after - player.rating,
    };
  });
}

export function shouldAdjustRating(mode: string): boolean {
  return mode === "ranked";
}

export function recordsMatchStats(mode: string): boolean {
  return mode === "ranked" || mode === "casual";
}
