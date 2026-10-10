import { describe, expect, it } from "vitest";
import { commentaryFromEvents } from "@/lib/game/commentary";
import { createInitialGame, startNextRound } from "@/lib/game/game-engine";
import { isGameOver } from "@/lib/game/turn-manager";
import { validateTeamLineup } from "@/lib/game/teams";
import type { GameState } from "@/lib/game/types";
import { rng } from "./helpers";

function teamGame(): GameState {
  return createInitialGame({
    id: "game-teams",
    roomId: "room-teams",
    roomCode: "TEAM01",
    hostPlayerId: "p1",
    format: "teams",
    randomInt: rng(3),
    players: [
      { id: "p1", nickname: "Hugo", seatIndex: 0, connected: true, ready: true, teamId: "A" },
      { id: "p2", nickname: "Sarah", seatIndex: 1, connected: true, ready: true, teamId: "A" },
      { id: "p3", nickname: "Alex", seatIndex: 2, connected: true, ready: true, teamId: "B" },
      { id: "p4", nickname: "Noah", seatIndex: 3, connected: true, ready: true, teamId: "B" },
    ],
  });
}

function atRoundEnd(game: GameState, eliminated: string[]): GameState {
  return {
    ...game,
    status: "ROUND_END",
    players: game.players.map((player) => ({
      ...player,
      eliminated: eliminated.includes(player.id) || player.eliminated,
      hand: [],
    })),
  };
}

describe("team lineup", () => {
  it("rejects odd tables, duplicates, and uneven teams", () => {
    expect(validateTeamLineup([{ id: "a", teamId: "A" }], 5)).toMatch(/4, 6, or 8/);
    expect(
      validateTeamLineup(
        [
          { id: "a", teamId: "A" },
          { id: "a", teamId: "B" },
          { id: "b", teamId: "A" },
          { id: "c", teamId: "B" },
        ],
        4,
      ),
    ).toMatch(/both teams/);
    expect(
      validateTeamLineup(
        [
          { id: "a", teamId: "A" },
          { id: "b", teamId: "A" },
          { id: "c", teamId: "A" },
          { id: "d", teamId: "B" },
        ],
        4,
      ),
    ).toMatch(/same size/);
    expect(
      validateTeamLineup(
        [
          { id: "a", teamId: "A" },
          { id: "b", teamId: "B" },
          { id: "c", teamId: null },
          { id: "d", teamId: "B" },
        ],
        4,
      ),
    ).toMatch(/needs a team/);
  });
});

describe("team elimination", () => {
  it("keeps a team alive after one teammate is eliminated", () => {
    const next = startNextRound(atRoundEnd(teamGame(), ["p1"]), rng(9));
    expect(next.status).toBe("PLAYING");
    expect(isGameOver(next)).toBe(false);
    expect(next.players.find((player) => player.id === "p1")?.eliminated).toBe(true);
    expect(next.players.find((player) => player.id === "p2")?.hand).toHaveLength(5);
    expect(next.winnerTeamId ?? null).toBeNull();
  });

  it("supports 3v3 and 4v4 with the same elimination rule", () => {
    for (const size of [6, 8]) {
      const players = Array.from({ length: size }, (_, index) => ({
        id: `p${index + 1}`,
        nickname: `P${index + 1}`,
        seatIndex: index,
        connected: true,
        ready: true,
        teamId: (index < size / 2 ? "A" : "B") as "A" | "B",
      }));
      const game = createInitialGame({
        id: `teams-${size}`,
        roomId: `room-${size}`,
        roomCode: "TEAM02",
        hostPlayerId: "p1",
        format: "teams",
        randomInt: rng(size),
        players,
      });
      const half = players.filter((player) => player.teamId === "B").map((player) => player.id);
      const next = startNextRound(atRoundEnd(game, [half[0]!]), rng(size));
      expect(next.status).toBe("PLAYING");
      const won = startNextRound(atRoundEnd(game, half), rng(size + 1));
      expect(won.winnerTeamId).toBe("A");
      expect(won.status).toBe("GAME_OVER");
    }
  });

  it("gives the match to the team that still has a player", () => {
    const next = startNextRound(atRoundEnd(teamGame(), ["p3", "p4"]), rng(9));
    expect(next.status).toBe("GAME_OVER");
    expect(next.winnerId).toBeNull();
    expect(next.winnerTeamId).toBe("A");
    const lines = commentaryFromEvents(next.events, next.players);
    expect(lines.some((line) => line.text === "Team A wins!")).toBe(true);
  });

  it("ends as a draw when both teams are eliminated together", () => {
    const next = startNextRound(atRoundEnd(teamGame(), ["p1", "p2", "p3", "p4"]), rng(9));
    expect(next.status).toBe("GAME_OVER");
    expect(next.winnerTeamId).toBeNull();
    const lines = commentaryFromEvents(next.events, next.players);
    expect(lines.some((line) => line.text.includes("draw"))).toBe(true);
  });

  it("still ends an individual game when one player remains", () => {
    const game = createInitialGame({
      id: "game-solo",
      roomId: "room-solo",
      roomCode: "SOLO01",
      hostPlayerId: "p1",
      randomInt: rng(2),
      players: [
        { id: "p1", nickname: "Hugo", seatIndex: 0, connected: true, ready: true },
        { id: "p2", nickname: "Alex", seatIndex: 1, connected: true, ready: true },
      ],
    });
    const next = startNextRound(atRoundEnd(game, ["p2"]), rng(4));
    expect(next.status).toBe("GAME_OVER");
    expect(next.winnerId).toBe("p1");
    expect(next.winnerTeamId ?? null).toBeNull();
  });
});
