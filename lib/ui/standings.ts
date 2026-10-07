import { ranking } from "@/lib/game/turn-manager";

export type StandingStatus = "PLAYING" | "ELIMINATED" | "WINNER";
export type MedalPlace = "gold" | "silver" | "bronze";

export type StandingInput = {
  id: string;
  nickname: string;
  seatIndex: number;
  score: number;
  roundScore: number | null;
  eliminated: boolean;
};

export type Standing = {
  playerId: string;
  nickname: string;
  rank: number;
  score: number;
  roundScore: number | null;
  status: StandingStatus;
  tied: boolean;
  medal: MedalPlace | null;
  eliminated: boolean;
  seatIndex: number;
};

const MEDALS: Record<number, MedalPlace | undefined> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export function deriveStandings(players: StandingInput[], winnerId: string | null): Standing[] {
  const ordered = ranking(
    [...players]
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        seatIndex: player.seatIndex,
        hand: [],
        totalScore: player.score,
        lastRoundScore: player.roundScore,
        eliminated: player.eliminated,
        connected: true,
        ready: true,
      })),
  ).map((player) => ({
    id: player.id,
    nickname: player.nickname,
    seatIndex: player.seatIndex,
    score: player.totalScore,
    roundScore: player.lastRoundScore,
    eliminated: player.eliminated,
  }));

  return ordered.map((player, index) => {
    const rank = competitionRank(ordered, index);
    const tied =
      ordered.filter(
        (entry) => entry.score === player.score && entry.eliminated === player.eliminated,
      ).length > 1;
    const status: StandingStatus =
      winnerId === player.id ? "WINNER" : player.eliminated ? "ELIMINATED" : "PLAYING";
    return {
      playerId: player.id,
      nickname: player.nickname,
      rank,
      score: player.score,
      roundScore: player.roundScore,
      status,
      tied,
      medal: MEDALS[rank] ?? null,
      eliminated: player.eliminated,
      seatIndex: player.seatIndex,
    };
  });
}

function competitionRank(ordered: StandingInput[], index: number): number {
  let cursor = index;
  while (cursor > 0) {
    const current = ordered[cursor];
    const previous = ordered[cursor - 1];
    if (
      !current ||
      !previous ||
      current.score !== previous.score ||
      current.eliminated !== previous.eliminated
    ) {
      break;
    }
    cursor -= 1;
  }
  return cursor + 1;
}

export function placeLabel(rank: number): string {
  if (rank === 1) {
    return "First place";
  }
  if (rank === 2) {
    return "Second place";
  }
  if (rank === 3) {
    return "Third place";
  }
  return `Place ${rank}`;
}
