import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertGameMember, collectAllCardIds, GameEngineError } from "@/lib/game/game-engine";
import { getPublicGameStateForPlayer } from "@/lib/game/projection";
import { assertSameOrigin } from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { readSession, signSession } from "@/lib/server/session-token";
import { HttpError } from "@/lib/server/errors";
import { normalizeNickname } from "@/lib/utils/identity";
import { makeGame } from "./helpers";

describe("anonymous sessions", () => {
  it("rejects a raw player id and a tampered cookie", () => {
    const token = signSession("11111111-1111-4111-8111-111111111111", 1_000);
    expect(readSession(token, 1_000)).toBe("11111111-1111-4111-8111-111111111111");
    expect(readSession("11111111-1111-4111-8111-111111111111", 1_000)).toBeNull();
    const [version, payload] = token.split(".");
    expect(readSession(`${version}.${payload}.tampered`, 1_000)).toBeNull();
    expect(readSession(token, 1_000 + 1000 * 60 * 60 * 24 * 31)).toBeNull();
  });
});

describe("hidden information", () => {
  it("hides the other hand and strips card ids from events", () => {
    const game = makeGame();
    game.events.push({
      id: "evt-secret",
      sequenceNumber: 99,
      type: "PLAYER_DREW",
      actorPlayerId: "player-1",
      payload: { source: "DECK", cardId: "secret-drawn-card", hand: game.players[1]?.hand },
      timestamp: 1,
    });
    const view = getPublicGameStateForPlayer(game, "player-1");
    expect(view.players.find((player) => player.id === "player-2")?.hand).toBeNull();
    expect(view.me?.hand).toHaveLength(5);
    expect(view.roundResult).toBeNull();
    const drawn = view.events.find((event) => event.id === "evt-secret");
    expect(drawn?.payload).toEqual({ source: "DECK" });
    const hiddenIds = game.players[1]?.hand.map((card) => card.id) ?? [];
    const serialized = JSON.stringify(view);
    for (const id of hiddenIds) {
      expect(serialized).not.toContain(id);
    }
  });

  it("keeps all 104 physical cards in one place", () => {
    const game = makeGame();
    expect(new Set(collectAllCardIds(game)).size).toBe(104);
  });
});

describe("authorization boundaries", () => {
  it("rejects the next round from someone who is not in the game", () => {
    const game = makeGame();
    expect(() => assertGameMember(game, "outsider")).toThrow(GameEngineError);
  });

  it("blocks cross-site mutations", () => {
    const request = new Request("https://carramba.online/api/rooms", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(() => assertSameOrigin(request)).toThrow(HttpError);
  });

  it("allows the site's own origin", () => {
    const request = new Request("https://www.carramba.online/api/rooms", {
      method: "POST",
      headers: { origin: "https://www.carramba.online", host: "www.carramba.online" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});

describe("abuse limits", () => {
  it("stops a burst of room creation", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 8; i += 1) {
      expect(consumeRateLimit(key, "room-create", 1_000)).toBe(true);
    }
    expect(consumeRateLimit(key, "room-create", 1_000)).toBe(false);
  });

  it("removes control characters from nicknames", () => {
    expect(normalizeNickname("A\u0000li\u202Ece")).toBe("Alice");
  });
});

describe("database row access", () => {
  it("denies the public anon key when the server secret is absent", async () => {
    const envPath = ".env.local";
    if (!existsSync(envPath)) {
      return;
    }
    const env = Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return;
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rooms = await client.from("rooms").select("id");
    const games = await client.from("games").select("state");
    expect(rooms.data ?? []).toEqual([]);
    expect(games.data ?? []).toEqual([]);
    const inserted = await client.from("rooms").insert({
      id: crypto.randomUUID(),
      code: "NOPE01",
      host_player_id: "attacker",
      status: "LOBBY",
      max_players: 8,
    });
    expect(inserted.error).not.toBeNull();
  });
});
