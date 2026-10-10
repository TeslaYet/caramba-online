import { describe, expect, it } from "vitest";
import { createInitialGame } from "@/lib/game/game-engine";
import { getNextActivePlayer } from "@/lib/game/turn-manager";
import { rng } from "./helpers";

describe("table sizes", () => {
  it("deals a legal game for every count from 2 to 8", () => {
    for (let count = 2; count <= 8; count += 1) {
      const players = Array.from({ length: count }, (_, index) => ({
        id: `p${index + 1}`,
        nickname: index === 0 ? "Hugo" : `Bot ${index}`,
        seatIndex: index,
        connected: true,
        ready: true,
        isBot: index > 0,
      }));
      const game = createInitialGame({
        id: `game-${count}`,
        roomId: `room-${count}`,
        roomCode: "SIZE01",
        hostPlayerId: "p1",
        randomInt: rng(count),
        players,
      });
      expect(game.players).toHaveLength(count);
      expect(game.players.filter((player) => !player.isBot)).toHaveLength(1);
      const cardIds = game.players.flatMap((player) => player.hand.map((card) => card.id));
      expect(new Set(cardIds).size).toBe(cardIds.length);
      expect(cardIds).toHaveLength(count * 5);
      expect(game.drawPile.length + cardIds.length).toBe(104);
      expect(game.currentPlayerId && players.some((player) => player.id === game.currentPlayerId)).toBe(
        true,
      );

      const seen = new Set<string>();
      let cursor = game.currentPlayerId;
      for (let step = 0; step < count; step += 1) {
        expect(cursor).toBeTruthy();
        seen.add(cursor!);
        cursor = getNextActivePlayer(game, cursor!)?.id ?? null;
      }
      expect(seen.size).toBe(count);
    }
  });
});
