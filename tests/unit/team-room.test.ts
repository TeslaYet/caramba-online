import { describe, expect, it } from "vitest";
import {
  assignTeam,
  createRoom,
  joinRoom,
  setReady,
  setTableFormat,
  startGame,
} from "@/lib/server/game-service";

describe("team room controls", () => {
  it("lets only the host assign equal teams, and rejects an uneven start", async () => {
    const host = await createRoom("host-team", "Hugo");
    const code = host.room.code;
    const sarah = await joinRoom("seat-sarah", "Sarah", code);
    const alex = await joinRoom("seat-alex", "Alex", code);
    const noah = await joinRoom("seat-noah", "Noah", code);

    await setTableFormat(code, "host-team", "teams", 4);
    await expect(assignTeam(code, sarah.player.id, sarah.player.id, "B")).rejects.toThrow(/host/i);

    await setReady(code, sarah.player.id, true);
    await setReady(code, alex.player.id, true);
    await setReady(code, noah.player.id, true);
    await assignTeam(code, "host-team", "host-team", "A");
    await assignTeam(code, "host-team", sarah.player.id, "A");
    await assignTeam(code, "host-team", alex.player.id, "A");
    await assignTeam(code, "host-team", noah.player.id, "B");
    await expect(startGame(code, "host-team")).rejects.toThrow(/same size/i);

    await assignTeam(code, "host-team", alex.player.id, "B");
    const started = await startGame(code, "host-team");
    expect(started.players).toHaveLength(4);
    expect(started.format).toBe("teams");
    expect(started.players.filter((player) => player.teamId === "A")).toHaveLength(2);
    expect(started.players.filter((player) => player.teamId === "B")).toHaveLength(2);
    await expect(assignTeam(code, "host-team", sarah.player.id, "A")).rejects.toThrow(/lock/i);
  });
});
